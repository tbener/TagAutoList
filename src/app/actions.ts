"use server";

import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
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

/** New tags go above every existing one (mirrors `withNewTagOnTop` in lib/ops.ts). */
async function topPosition(tx: Tx | typeof db, uid: string) {
  const [row] = await tx
    .select({ min: sql<number | null>`min(${tags.position})` })
    .from(tags)
    .where(eq(tags.userId, uid));
  return row?.min == null ? 0 : Number(row.min) - 1;
}

/** Where a new association goes in a tag's list: above every existing one (mirrors `topLinkPosition`). */
async function topLinkPosition(tx: Tx, tagId: string) {
  const [row] = await tx
    .select({ min: sql<number | null>`min(${itemTags.position})` })
    .from(itemTags)
    .where(eq(itemTags.tagId, tagId));
  return row?.min == null ? 0 : Number(row.min) - 1;
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
        .values({ ...idField(ref.id), userId: uid, name: ref.name, position: await topPosition(tx, uid) })
        .onConflictDoNothing();
      row = await find();
      if (!row) {
        // The client's id was taken (never expected) — let the DB pick one.
        await tx
          .insert(tags)
          .values({ userId: uid, name: ref.name, position: await topPosition(tx, uid) })
          .onConflictDoNothing();
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
    .values({ ...idField(id), userId: uid, name: clean, position: await topPosition(db, uid) })
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
 * Persist a manual order: `orderedIds` top to bottom. Tags the client didn't
 * know about keep their relative order below the listed ones (and trigger a resync).
 */
export async function reorderTags(orderedIds: string[]): Promise<Result> {
  const uid = await userId();
  let resync = false;
  await db.transaction(async (tx) => {
    const mine = await tx
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.userId, uid))
      .orderBy(asc(tags.position), asc(tags.name));
    const known = new Set(mine.map((t) => t.id));
    const first = [...new Set(orderedIds)].filter((id) => known.has(id));
    const listed = new Set(first);
    const rest = mine.map((t) => t.id).filter((id) => !listed.has(id));
    resync = rest.length > 0;
    const order = [...first, ...rest];
    if (!order.length) return;
    const values = sql.join(
      order.map((id, i) => sql`(${id}::uuid, ${i}::integer)`),
      sql`, `,
    );
    await tx.execute(sql`
      update tags set position = v.pos
      from (values ${values}) as v(id, pos)
      where tags.id = v.id and tags.user_id = ${uid}`);
  });
  return resync ? { resync } : {};
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
    for (const tagId of resolved.ids)
      await tx
        .insert(itemTags)
        .values({ itemId: item.id, tagId, position: await topLinkPosition(tx, tagId) })
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
      if (!current)
        await tx.insert(itemTags).values({ itemId, tagId, position: await topLinkPosition(tx, tagId) });
      else if (current.completedAt) // re-adding a finished tag reactivates it, on top
        await tx
          .update(itemTags)
          .set({ completedAt: null, position: await topLinkPosition(tx, tagId) })
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

/**
 * Remove an item from some of its active lists. If it has no active
 * association left afterwards, the item is deleted entirely.
 */
export async function removeItemFromTags(itemId: string, tagIds: string[]): Promise<Result> {
  const uid = await userId();
  if (!tagIds.length) return {};
  await db.transaction(async (tx) => {
    await ownedItem(tx, uid, itemId);
    await tx
      .delete(itemTags)
      .where(
        and(
          eq(itemTags.itemId, itemId),
          inArray(itemTags.tagId, tagIds),
          isNull(itemTags.completedAt),
        ),
      );
    const [active] = await tx
      .select({ tagId: itemTags.tagId })
      .from(itemTags)
      .where(and(eq(itemTags.itemId, itemId), isNull(itemTags.completedAt)))
      .limit(1);
    if (!active) await tx.delete(items).where(and(eq(items.id, itemId), eq(items.userId, uid)));
  });
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
      .set({ completedAt: null, position: await topLinkPosition(tx, tagId) })
      .where(
        and(eq(itemTags.itemId, itemId), eq(itemTags.tagId, tagId), isNotNull(itemTags.completedAt)),
      );
  });
  return {};
}

async function ownedTag(tx: Tx, uid: string, tagId: string) {
  const [row] = await tx
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, uid)));
  if (!row) throw new Error("List not found");
}

/**
 * Add an existing tag to an item, at the top of that list (drop-to-tag).
 * A finished association is reactivated; an active one is left alone.
 */
export async function addItemTag(itemId: string, tagId: string): Promise<Result> {
  const uid = await userId();
  await db.transaction(async (tx) => {
    await ownedItem(tx, uid, itemId);
    await ownedTag(tx, uid, tagId);
    const [current] = await tx
      .select()
      .from(itemTags)
      .where(and(eq(itemTags.itemId, itemId), eq(itemTags.tagId, tagId)));
    if (current && !current.completedAt) return;
    const position = await topLinkPosition(tx, tagId);
    if (current)
      await tx
        .update(itemTags)
        .set({ completedAt: null, position })
        .where(and(eq(itemTags.itemId, itemId), eq(itemTags.tagId, tagId)));
    else await tx.insert(itemTags).values({ itemId, tagId, position });
  });
  return {};
}

/**
 * Persist a manual item order within one list: `orderedItemIds` top to bottom.
 * The list's other associations keep their relative order below (mirrors
 * `reorderItems` in lib/ops.ts).
 */
export async function reorderItems(tagId: string, orderedItemIds: string[]): Promise<Result> {
  const uid = await userId();
  let resync = false;
  await db.transaction(async (tx) => {
    await ownedTag(tx, uid, tagId);
    const current = await tx
      .select({ itemId: itemTags.itemId })
      .from(itemTags)
      .innerJoin(items, eq(items.id, itemTags.itemId))
      .where(eq(itemTags.tagId, tagId))
      .orderBy(asc(itemTags.position), desc(items.createdAt), asc(items.id));
    const known = new Set(current.map((l) => l.itemId));
    const first = [...new Set(orderedItemIds)].filter((id) => known.has(id));
    const listed = new Set(first);
    const rest = current.map((l) => l.itemId).filter((id) => !listed.has(id));
    resync = first.length !== new Set(orderedItemIds).size;
    const order = [...first, ...rest];
    if (!order.length) return;
    const values = sql.join(
      order.map((id, i) => sql`(${id}::uuid, ${i}::integer)`),
      sql`, `,
    );
    await tx.execute(sql`
      update item_tags set position = v.pos
      from (values ${values}) as v(item_id, pos)
      where item_tags.item_id = v.item_id and item_tags.tag_id = ${tagId}::uuid`);
  });
  return resync ? { resync } : {};
}
