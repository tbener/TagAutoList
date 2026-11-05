/**
 * Pure state transitions on a Snapshot. The client store applies these
 * optimistically; they mirror what the server actions persist, so the two
 * stay in step (and the server is the fallback source of truth on any error).
 */
import { cleanNames, sameName } from "./names";
import { sortTags, type Snapshot, type Tag } from "./tree";

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
      ...p.refs.map((r) => ({ itemId: p.id, tagId: r.id, completedAt: null })),
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
    l.itemId === p.id && l.completedAt && wanted.has(l.tagId) ? { ...l, completedAt: null } : l,
  );
  for (const r of p.refs) {
    if (!have.has(r.id)) links.push({ itemId: p.id, tagId: r.id, completedAt: null });
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

export function restoreCompletion(snap: Snapshot, itemId: string, tagId: string): Snapshot {
  return {
    ...snap,
    links: snap.links.map((l) =>
      l.itemId === itemId && l.tagId === tagId ? { ...l, completedAt: null } : l,
    ),
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
