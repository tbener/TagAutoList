"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db, type Tx } from "@/db";
import { itemTags, items, tags } from "@/db/schema";

async function userId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

const refresh = () => revalidatePath("/", "layout");

const cleanName = (s: string) => s.trim().replace(/\s+/g, " ").slice(0, 60);

function cleanNames(names: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names.map(cleanName)) {
    if (n && !seen.has(n.toLowerCase())) {
      seen.add(n.toLowerCase());
      out.push(n);
    }
  }
  return out;
}

/** Find tags by name (case-insensitive), creating any that don't exist yet. */
async function resolveTagIds(tx: Tx, uid: string, names: string[]) {
  const ids: string[] = [];
  for (const name of cleanNames(names)) {
    await tx
      .insert(tags)
      .values({ userId: uid, name, isList: true }) // the UI only knows "lists"
      .onConflictDoNothing();
    const [row] = await tx
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.userId, uid), sql`lower(${tags.name}) = ${name.toLowerCase()}`));
    ids.push(row.id);
  }
  return ids;
}

async function ownedItem(tx: Tx, uid: string, itemId: string) {
  const [row] = await tx
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, uid)));
  if (!row) throw new Error("Item not found");
}

// ---------- tags ----------

export async function createTag(
  name: string,
  isList: boolean,
): Promise<{ error?: string; id?: string }> {
  const uid = await userId();
  const clean = cleanName(name);
  if (!clean) return { error: "Name is required" };
  const inserted = await db
    .insert(tags)
    .values({ userId: uid, name: clean, isList })
    .onConflictDoNothing()
    .returning({ id: tags.id });
  if (!inserted.length) return { error: `"${clean}" already exists` };
  refresh();
  return { id: inserted[0].id };
}

export async function renameTag(tagId: string, name: string) {
  const uid = await userId();
  const clean = cleanName(name);
  if (!clean) return { error: "Name is required" };
  try {
    await db
      .update(tags)
      .set({ name: clean })
      .where(and(eq(tags.id, tagId), eq(tags.userId, uid)));
  } catch {
    return { error: `"${clean}" already exists` };
  }
  refresh();
  return {};
}

/**
 * Removes the tag from every item. Items left with no associations at all are
 * deleted with it; items with other tags survive under those.
 */
export async function deleteTag(tagId: string) {
  const uid = await userId();
  await db.transaction(async (tx) => {
    const deleted = await tx
      .delete(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, uid)))
      .returning({ id: tags.id }); // item_tags rows cascade
    if (!deleted.length) return;
    await tx.execute(sql`
      delete from items
      where user_id = ${uid}
        and not exists (select 1 from item_tags it where it.item_id = items.id)`);
  });
  refresh();
}

// ---------- items ----------

export async function createItem(input: {
  title: string;
  tagNames: string[];
}) {
  const uid = await userId();
  const title = input.title.trim();
  if (!title) return { error: "Title is required" };
  if (!cleanNames(input.tagNames).length) return { error: "Add at least one tag" };
  await db.transaction(async (tx) => {
    const tagIds = await resolveTagIds(tx, uid, input.tagNames);
    const [item] = await tx
      .insert(items)
      .values({ userId: uid, title })
      .returning({ id: items.id });
    await tx
      .insert(itemTags)
      .values(tagIds.map((tagId) => ({ itemId: item.id, tagId })));
  });
  refresh();
  return {};
}

/** Edit title/notes and sync the item's *active* tags to `tagNames`. */
export async function updateItem(
  itemId: string,
  input: { title: string; notes: string; tagNames: string[] },
) {
  const uid = await userId();
  const title = input.title.trim();
  if (!title) return { error: "Title is required" };
  if (!cleanNames(input.tagNames).length) return { error: "An item needs at least one tag" };
  await db.transaction(async (tx) => {
    await ownedItem(tx, uid, itemId);
    await tx.update(items).set({ title, notes: input.notes }).where(eq(items.id, itemId));

    const wanted = new Set(await resolveTagIds(tx, uid, input.tagNames));
    const existing = await tx.select().from(itemTags).where(eq(itemTags.itemId, itemId));
    const toRemove = existing
      .filter((l) => !l.completedAt && !wanted.has(l.tagId))
      .map((l) => l.tagId);
    if (toRemove.length)
      await tx
        .delete(itemTags)
        .where(and(eq(itemTags.itemId, itemId), inArray(itemTags.tagId, toRemove)));

    for (const tagId of wanted) {
      const current = existing.find((l) => l.tagId === tagId);
      if (!current) await tx.insert(itemTags).values({ itemId, tagId });
      else if (current.completedAt) // re-adding a finished tag reactivates it
        await tx
          .update(itemTags)
          .set({ completedAt: null })
          .where(and(eq(itemTags.itemId, itemId), eq(itemTags.tagId, tagId)));
    }
  });
  refresh();
  return {};
}

export async function deleteItem(itemId: string) {
  const uid = await userId();
  await db.delete(items).where(and(eq(items.id, itemId), eq(items.userId, uid)));
  refresh();
}

/** Mark the given tag associations complete (kept for history, not deleted). */
export async function completeItem(itemId: string, tagIds: string[]) {
  const uid = await userId();
  if (!tagIds.length) return;
  await db.transaction(async (tx) => {
    await ownedItem(tx, uid, itemId);
    await tx
      .update(itemTags)
      .set({ completedAt: new Date() })
      .where(
        and(
          eq(itemTags.itemId, itemId),
          inArray(itemTags.tagId, tagIds),
          isNull(itemTags.completedAt),
        ),
      );
  });
  refresh();
}

/** Undo a completion from the history view. */
export async function restoreCompletion(itemId: string, tagId: string) {
  const uid = await userId();
  await db.transaction(async (tx) => {
    await ownedItem(tx, uid, itemId);
    await tx
      .update(itemTags)
      .set({ completedAt: null })
      .where(and(eq(itemTags.itemId, itemId), eq(itemTags.tagId, tagId)));
  });
  refresh();
}
