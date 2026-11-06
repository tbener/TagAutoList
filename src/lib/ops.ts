/**
 * Pure state transitions on a Snapshot. The client store applies these
 * optimistically; they mirror what the server actions persist, so the two
 * stay in step (and the server is the fallback source of truth on any error).
 */
import { cleanNames, sameName } from "./names";
import { orderedTagLinks, sortTags, type Link, type Snapshot, type Tag } from "./tree";

export type TagRef = { id: string; name: string };

/** Map names to existing tags, or to fresh refs (with new ids) for unknown ones. */
export function resolveRefs(snap: Snapshot, names: string[], newId: () => string): TagRef[] {
  return cleanNames(names).map((name) => {
    const existing = snap.tags.find((t) => sameName(t.name, name));
    return existing ? { id: existing.id, name: existing.name } : { id: newId(), name };
  });
}

/** The one place that decides where a new tag goes: above every existing one. */
function withNewTagOnTop(tags: Tag[], ref: TagRef): Tag[] {
  const position = tags.length ? Math.min(...tags.map((t) => t.position)) - 1 : 0;
  return [...tags, { id: ref.id, name: ref.name, position }];
}

/** Where a new association goes in a tag's list: above every existing one. */
export function topLinkPosition(links: Link[], tagId: string): number {
  let min: number | null = null;
  for (const l of links) if (l.tagId === tagId && (min === null || l.position < min)) min = l.position;
  return min === null ? 0 : min - 1;
}

function withTags(snap: Snapshot, refs: TagRef[]): Snapshot {
  const known = new Set(snap.tags.map((t) => t.id));
  let tags = snap.tags;
  for (const r of refs) {
    if (known.has(r.id)) continue;
    known.add(r.id);
    tags = withNewTagOnTop(tags, r);
  }
  return tags === snap.tags ? snap : { ...snap, tags };
}

export function addItem(
  snap: Snapshot,
  p: { id: string; title: string; refs: TagRef[]; now: Date },
): Snapshot {
  const s = withTags(snap, p.refs);
  return {
    ...s,
    items: [...s.items, { id: p.id, title: p.title, notes: "", createdAt: p.now }],
    links: [
      ...s.links,
      ...p.refs.map((r) => ({
        itemId: p.id,
        tagId: r.id,
        completedAt: null,
        position: topLinkPosition(s.links, r.id),
      })),
    ],
  };
}

/** Edit title/notes and sync the item's *active* tags to `refs`. */
export function updateItem(
  snap: Snapshot,
  p: { id: string; title: string; notes: string; refs: TagRef[] },
): Snapshot {
  const s = withTags(snap, p.refs);
  const wanted = new Set(p.refs.map((r) => r.id));
  // Drop active associations that are no longer wanted; completed ones are history.
  let links = s.links.filter((l) => l.itemId !== p.id || l.completedAt || wanted.has(l.tagId));
  const have = new Set(links.filter((l) => l.itemId === p.id).map((l) => l.tagId));
  // Re-adding a finished tag reactivates it.
  links = links.map((l) =>
    l.itemId === p.id && l.completedAt && wanted.has(l.tagId)
      ? { ...l, completedAt: null, position: topLinkPosition(s.links, l.tagId) }
      : l,
  );
  for (const r of p.refs) {
    if (!have.has(r.id))
      links.push({
        itemId: p.id,
        tagId: r.id,
        completedAt: null,
        position: topLinkPosition(s.links, r.id),
      });
  }
  return {
    ...s,
    items: s.items.map((i) => (i.id === p.id ? { ...i, title: p.title, notes: p.notes } : i)),
    links,
  };
}

export function deleteItem(snap: Snapshot, id: string): Snapshot {
  return {
    ...snap,
    items: snap.items.filter((i) => i.id !== id),
    links: snap.links.filter((l) => l.itemId !== id),
  };
}

/**
 * Remove an item from some of its active lists. Completed associations are
 * history and stay. If no active association is left, the item is deleted
 * entirely (same as `deleteItem`).
 */
export function removeItemFromTags(snap: Snapshot, itemId: string, tagIds: string[]): Snapshot {
  const ids = new Set(tagIds);
  const links = snap.links.filter((l) => !(l.itemId === itemId && !l.completedAt && ids.has(l.tagId)));
  const stillActive = links.some((l) => l.itemId === itemId && !l.completedAt);
  return stillActive ? { ...snap, links } : deleteItem({ ...snap, links }, itemId);
}

export function completeItem(snap: Snapshot, itemId: string, tagIds: string[], now: Date): Snapshot {
  const ids = new Set(tagIds);
  return {
    ...snap,
    links: snap.links.map((l) =>
      l.itemId === itemId && ids.has(l.tagId) && !l.completedAt ? { ...l, completedAt: now } : l,
    ),
  };
}

/** Un-complete an association; it comes back at the top of that list. */
export function restoreCompletion(snap: Snapshot, itemId: string, tagId: string): Snapshot {
  const top = topLinkPosition(snap.links, tagId);
  return {
    ...snap,
    links: snap.links.map((l) =>
      l.itemId === itemId && l.tagId === tagId && l.completedAt
        ? { ...l, completedAt: null, position: top }
        : l,
    ),
  };
}

export function hasActiveTag(snap: Snapshot, itemId: string, tagId: string): boolean {
  return snap.links.some((l) => l.itemId === itemId && l.tagId === tagId && !l.completedAt);
}

/**
 * Add a tag to an item, at the top of that list. A finished association is
 * reactivated; one that is already active is left alone.
 */
export function addTagToItem(snap: Snapshot, itemId: string, tagId: string): Snapshot {
  if (!snap.items.some((i) => i.id === itemId) || !snap.tags.some((t) => t.id === tagId)) return snap;
  if (hasActiveTag(snap, itemId, tagId)) return snap;
  const top = topLinkPosition(snap.links, tagId);
  const existing = snap.links.some((l) => l.itemId === itemId && l.tagId === tagId);
  return {
    ...snap,
    links: existing
      ? snap.links.map((l) =>
          l.itemId === itemId && l.tagId === tagId ? { ...l, completedAt: null, position: top } : l,
        )
      : [...snap.links, { itemId, tagId, completedAt: null, position: top }],
  };
}

/**
 * Apply a new item order *within one list*. `orderedItemIds` is the visible
 * order, top to bottom; the list's other associations (e.g. completed ones)
 * keep their relative order below. Other lists are untouched.
 */
export function reorderItems(snap: Snapshot, tagId: string, orderedItemIds: string[]): Snapshot {
  const current = orderedTagLinks(snap, tagId);
  const known = new Set(current.map((l) => l.itemId));
  const first = [...new Set(orderedItemIds)].filter((id) => known.has(id));
  const listed = new Set(first);
  const rest = current.map((l) => l.itemId).filter((id) => !listed.has(id));
  const index = new Map([...first, ...rest].map((id, i) => [id, i]));
  return {
    ...snap,
    links: snap.links.map((l) => (l.tagId === tagId ? { ...l, position: index.get(l.itemId)! } : l)),
  };
}

export function addTag(snap: Snapshot, tag: TagRef): Snapshot {
  return { ...snap, tags: withNewTagOnTop(snap.tags, tag) };
}

/**
 * Apply a new manual order. `orderedIds` is the full list, top to bottom;
 * anything missing from it keeps its relative order below the listed ones.
 */
export function reorderTags(snap: Snapshot, orderedIds: string[]): Snapshot {
  const known = new Set(snap.tags.map((t) => t.id));
  const first = [...new Set(orderedIds)].filter((id) => known.has(id));
  const listed = new Set(first);
  const rest = sortTags(snap.tags)
    .map((t) => t.id)
    .filter((id) => !listed.has(id));
  const index = new Map([...first, ...rest].map((id, i) => [id, i]));
  return { ...snap, tags: snap.tags.map((t) => ({ ...t, position: index.get(t.id)! })) };
}

/** "<name> - copy", or "- copy 2", "- copy 3"… when that name is taken (case-insensitive). */
export function copyName(tags: Tag[], base: string): string {
  const taken = new Set(tags.map((t) => t.name.toLowerCase()));
  let name = `${base} - copy`;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base} - copy ${n}`;
  return name;
}

/**
 * Duplicate a list: a new tag (on top, named by `copyName`) holding *new* items
 * copied from the original's currently active items, in the same order. Each
 * copy also joins every other list its original is still active in (placed
 * directly after the original there). The original tag is not added to the
 * copies, completed associations aren't copied, and nothing links a copy to
 * its original. `idFor` supplies the new item ids (client-generated).
 */
export function duplicateList(
  snap: Snapshot,
  p: { tagId: string; newTagId: string; idFor: (srcItemId: string) => string; now: Date },
): Snapshot {
  const src = snap.tags.find((t) => t.id === p.tagId);
  if (!src) return snap;
  const itemById = new Map(snap.items.map((i) => [i.id, i]));
  const order = orderedTagLinks(snap, p.tagId)
    .filter((l) => !l.completedAt && itemById.has(l.itemId))
    .map((l) => l.itemId);
  const copyOf = new Map(order.map((id) => [id, p.idFor(id)]));

  const tags = withNewTagOnTop(snap.tags, { id: p.newTagId, name: copyName(snap.tags, src.name) });
  const items = [
    ...snap.items,
    ...order.map((id) => {
      const orig = itemById.get(id)!;
      return { id: copyOf.get(id)!, title: orig.title, notes: orig.notes, createdAt: p.now };
    }),
  ];

  let links: Link[] = [
    ...snap.links,
    ...order.map((id, position) => ({
      itemId: copyOf.get(id)!,
      tagId: p.newTagId,
      completedAt: null,
      position,
    })),
  ];

  // The other lists the originals are active in: slot each copy in right after its original.
  const others = new Set<string>();
  for (const l of snap.links)
    if (copyOf.has(l.itemId) && !l.completedAt && l.tagId !== p.tagId) others.add(l.tagId);
  for (const tagId of others) {
    const sequence: string[] = [];
    for (const l of orderedTagLinks(snap, tagId)) {
      sequence.push(l.itemId);
      if (copyOf.has(l.itemId) && !l.completedAt) sequence.push(copyOf.get(l.itemId)!);
    }
    const index = new Map(sequence.map((id, i) => [id, i]));
    links = links.map((l) =>
      l.tagId === tagId && index.has(l.itemId) ? { ...l, position: index.get(l.itemId)! } : l,
    );
    for (const l of snap.links) {
      if (l.tagId === tagId && copyOf.has(l.itemId) && !l.completedAt)
        links.push({
          itemId: copyOf.get(l.itemId)!,
          tagId,
          completedAt: null,
          position: index.get(copyOf.get(l.itemId)!)!,
        });
    }
  }
  return { tags, items, links };
}

export function renameTag(snap: Snapshot, id: string, name: string): Snapshot {
  return { ...snap, tags: snap.tags.map((t) => (t.id === id ? { ...t, name } : t)) };
}

/** Removes the tag everywhere; items left with no association at all go too. */
export function deleteTag(snap: Snapshot, id: string): Snapshot {
  const links = snap.links.filter((l) => l.tagId !== id);
  const linked = new Set(links.map((l) => l.itemId));
  return {
    tags: snap.tags.filter((t) => t.id !== id),
    items: snap.items.filter((i) => linked.has(i.id)),
    links,
  };
}
