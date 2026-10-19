/**
 * Pure state transitions on a Snapshot. The client store applies these
 * optimistically; they mirror what the server actions persist, so the two
 * stay in step (and the server is the fallback source of truth on any error).
 */
import { cleanNames, sameName } from "./names";
import type { Snapshot } from "./tree";

export type TagRef = { id: string; name: string };

/** Map names to existing tags, or to fresh refs (with new ids) for unknown ones. */
export function resolveRefs(snap: Snapshot, names: string[], newId: () => string): TagRef[] {
  return cleanNames(names).map((name) => {
    const existing = snap.tags.find((t) => sameName(t.name, name));
    return existing ? { id: existing.id, name: existing.name } : { id: newId(), name };
  });
}

function withTags(snap: Snapshot, refs: TagRef[]): Snapshot {
  const known = new Set(snap.tags.map((t) => t.id));
  const added = refs
    .filter((r) => !known.has(r.id))
    .map((r) => ({ id: r.id, name: r.name, isList: true }));
  return added.length ? { ...snap, tags: [...snap.tags, ...added] } : snap;
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
  return { ...snap, tags: [...snap.tags, { id: tag.id, name: tag.name, isList: true }] };
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
