"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db, type Tx } from "@/db";
import { itemTags, items, tags } from "@/db/schema";
import { getSnapshot } from "@/lib/data";
import { cleanName } from "@/lib/names";
import type { Snapshot } from "@/lib/tree";

/**
 * The client applies every change optimistically and then calls these in
 * order. Ids for new rows are generated on the client so both sides agree.
 * `resync` asks the client to reload when the server had to deviate.
 */
type Result = { error?: string; resync?: boolean };
type TagRef = { id: string; name: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const idField = (id: string) => (UUID.test(id) ? { id } : {});

async function userId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

function cleanRefs(refs: TagRef[]) {
  const seen = new Set<string>();
  const out: TagRef[] = [];
  for (const r of refs) {
    const name = cleanName(r.name);
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      out.push({ id: r.id, name });
    }
  }
  return out;
}

/** Find tags by name (case-insensitive), creating unknown ones with the client's ids. */
async function resolveTagIds(tx: Tx, uid: string, refs: TagRef[]) {
  const ids: string[] = [];
  let mismatch = false;
  for (const ref of refs) {
    const find = async () =>
      (
        await tx
          .select({ id: tags.id })
          .from(tags)
          .where(and(eq(tags.userId, uid), sql`lower(${tags.name}) = ${ref.name.toLowerCase()}`))
      )[0];
    let row = await find();
    if (!row) {
      await tx
        .insert(tags)
        .values({ ...idField(ref.id), userId: uid, name: ref.name, isList: true })
        .onConflictDoNothing();
      row = await find();
      if (!row) {
        // The client's id was taken (never expected) — let the DB pick one.
        await tx.insert(tags).values({ userId: uid, name: ref.name, isList: true }).onConflictDoNothing();
        row = await find();
      }
    }
    if (row.id !== ref.id) mismatch = true;
    ids.push(row.id);
  }
  return { ids, mismatch };
}

async function ownedItem(tx: Tx, uid: string, itemId: string) {
  const [row] = await tx
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, uid)));
  if (!row) throw new Error("Item not found");
}

/** Full reload — used after errors and when the app regains focus. */
export async function loadSnapshot(): Promise<Snapshot> {
  return getSnapshot(await userId());
}

// ---------- tags ----------

export async function createTag(id: string, name: string): Promise<Result> {
  const uid = await userId();
  const clean = cleanName(name);
  if (!clean) return { error: "Name is required" };
  const inserted = await db
    .insert(tags)
    .values({ ...idField(id), userId: uid, name: clean, isList: true })
    .onConflictDoNothing()
    .returning({ id: tags.id });
  if (!inserted.length) return { error: `"${clean}" already exists` };
  return inserted[0].id === id ? {} : { resync: true };
}

export async function renameTag(tagId: string, name: string): Promise<Result> {
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
  return {};
}

/**
 * Removes the tag from every item. Items left with no associations at all are
 * deleted with it; items with other tags survive under those.
 */
export async function deleteTag(tagId: string): Promise<Result> {
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
  return {};
}

// ---------- items ----------

export async function createItem(input: {
  id: string;
  title: string;
  tags: TagRef[];
}): Promise<Result> {
  const uid = await userId();
  const title = input.title.trim();
  const refs = cleanRefs(input.tags);
  if (!title) return { error: "Title is required" };
  if (!refs.length) return { error: "Add at least one list" };
  let resync = !UUID.test(input.id);
  await db.transaction(async (tx) => {
    const resolved = await resolveTagIds(tx, uid, refs);
    if (resolved.mismatch) resync = true;
    const [item] = await tx
      .insert(items)
      .values({ ...idField(input.id), userId: uid, title })
      .onConflictDoNothing()
      .returning({ id: items.id });
    if (!item) return; // already created (e.g. a retry)
    await tx
      .insert(itemTags)
      .values(resolved.ids.map((tagId) => ({ itemId: item.id, tagId })))
      .onConflictDoNothing();
  });
  return resync ? { resync } : {};
}

/** Edit title/notes and sync the item's *active* tags to `input.tags`. */
export async function updateItem(
  itemId: string,
  input: { title: string; notes: string; tags: TagRef[] },
): Promise<Result> {
  const uid = await userId();
  const title = input.title.trim();
  const refs = cleanRefs(input.tags);
  if (!title) return { error: "Title is required" };
  if (!refs.length) return { error: "An item needs at least one list" };
  let resync = false;
  await db.transaction(async (tx) => {
    await ownedItem(tx, uid, itemId);
    await tx.update(items).set({ title, notes: input.notes }).where(eq(items.id, itemId));

    const resolved = await resolveTagIds(tx, uid, refs);
    resync = resolved.mismatch;
    const wanted = new Set(resolved.ids);
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
  return resync ? { resync } : {};
}

export async function deleteItem(itemId: string): Promise<Result> {
  const uid = await userId();
  await db.delete(items).where(and(eq(items.id, itemId), eq(items.userId, uid)));
  return {};
}

/** Mark the given tag associations complete (kept for history, not deleted). */
export async function completeItem(itemId: string, tagIds: string[]): Promise<Result> {
  const uid = await userId();
  if (!tagIds.length) return {};
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
  return {};
}

/** Undo a completion from the history view. */
export async function restoreCompletion(itemId: string, tagId: string): Promise<Result> {
  const uid = await userId();
  await db.transaction(async (tx) => {
    await ownedItem(tx, uid, itemId);
    await tx
      .update(itemTags)
      .set({ completedAt: null })
      .where(and(eq(itemTags.itemId, itemId), eq(itemTags.tagId, tagId)));
  });
  return {};
}
