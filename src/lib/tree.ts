/**
 * Pure, DB-free logic for the dynamic tag "tree". There is no stored
 * hierarchy: everything below is computed from item↔tag associations, so it
 * can be unit-tested and later reused (e.g. recurrence, search).
 */

export type Tag = { id: string; name: string; position: number };
export type Item = {
  id: string;
  title: string;
  notes: string;
  createdAt: Date;
};
export type Link = {
  itemId: string;
  tagId: string;
  completedAt: Date | null;
  /** Order of the item within this tag's list (lower = higher up). */
  position: number;
};
export type Snapshot = { tags: Tag[]; items: Item[]; links: Link[] };

/** An item plus the tags it is still *active* under. */
export type ItemView = Item & { tags: Tag[] };

const byName = (a: Tag, b: Tag) => a.name.localeCompare(b.name);

/** The user's manual list order (name only breaks ties). */
export const byPosition = (a: Tag, b: Tag) => a.position - b.position || byName(a, b);

export const sortTags = (tags: Tag[]) => [...tags].sort(byPosition);

/** Items that still have at least one incomplete association, with those tags. */
export function activeItems(snap: Snapshot): ItemView[] {
  const tagsById = new Map(snap.tags.map((t) => [t.id, t]));
  const activeTags = new Map<string, Tag[]>();
  for (const l of snap.links) {
    if (l.completedAt) continue;
    const tag = tagsById.get(l.tagId);
    if (!tag) continue;
    const list = activeTags.get(l.itemId) ?? [];
    list.push(tag);
    activeTags.set(l.itemId, list);
  }
  const out: ItemView[] = [];
  for (const item of snap.items) {
    const tags = activeTags.get(item.id);
    if (tags?.length) out.push({ ...item, tags: tags.sort(byName) });
  }
  return out;
}

const newestFirst = (a: Item, b: Item) =>
  b.createdAt.getTime() - a.createdAt.getTime();

/** A tag's associations in list order (position, then newest item, then id). */
export function orderedTagLinks(snap: Snapshot, tagId: string): Link[] {
  const created = new Map(snap.items.map((i) => [i.id, i.createdAt.getTime()]));
  return snap.links
    .filter((l) => l.tagId === tagId)
    .sort(
      (a, b) =>
        a.position - b.position ||
        (created.get(b.itemId) ?? 0) - (created.get(a.itemId) ?? 0) ||
        a.itemId.localeCompare(b.itemId),
    );
}

export type SubTag = { tag: Tag; count: number };

/**
 * Items under the intersection of `path` tags, plus every *other* tag that
 * co-occurs on at least one of those items (with how many items share it).
 * Items follow the order of the *first* tag of the path (the list the user
 * came in from); newest first only breaks ties.
 */
export function browse(snap: Snapshot, path: string[]) {
  const pos = new Map<string, number>();
  if (path.length)
    for (const l of snap.links) if (l.tagId === path[0]) pos.set(l.itemId, l.position);
  const items = activeItems(snap)
    .filter((i) => path.every((id) => i.tags.some((t) => t.id === id)))
    .sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0) || newestFirst(a, b));

  const counts = new Map<string, SubTag>();
  for (const item of items) {
    for (const tag of item.tags) {
      if (path.includes(tag.id)) continue;
      const entry = counts.get(tag.id) ?? { tag, count: 0 };
      entry.count++;
      counts.set(tag.id, entry);
    }
  }
  const subTags = [...counts.values()].sort((a, b) => byPosition(a.tag, b.tag));
  return { items, subTags };
}

/** Every tag (flat) with active/completed association counts. */
export function tagsWithCounts(snap: Snapshot) {
  const active = new Map<string, number>();
  const done = new Map<string, number>();
  for (const l of snap.links) {
    const m = l.completedAt ? done : active;
    m.set(l.tagId, (m.get(l.tagId) ?? 0) + 1);
  }
  return sortTags(snap.tags).map((tag) => ({
    tag,
    active: active.get(tag.id) ?? 0,
    completed: done.get(tag.id) ?? 0,
  }));
}

export type HistoryEntry = {
  itemId: string;
  title: string;
  completedAt: Date;
};

/** Completed associations for one tag, most recent first. */
export function history(snap: Snapshot, tagId: string): HistoryEntry[] {
  const titles = new Map(snap.items.map((i) => [i.id, i.title]));
  return snap.links
    .filter((l) => l.tagId === tagId && l.completedAt)
    .map((l) => ({
      itemId: l.itemId,
      title: titles.get(l.itemId) ?? "(deleted)",
      completedAt: l.completedAt!,
    }))
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
}

export type TreeNode = {
  tag: Tag;
  path: string[];
  /** Active items under this node's full path (intersection). */
  count: number;
  selected: boolean;
  /** Has sub-branches (shown as an expand chevron), whether or not open. */
  expandable: boolean;
  /** Only populated while the node is expanded. */
  children: TreeNode[];
};

export const nodeKey = (nodePath: string[]) => nodePath.join(">");

/** Keys of every node on `path` (each prefix) — what should be open to show it. */
export const pathKeys = (path: string[]) =>
  new Set(path.map((_, i) => nodeKey(path.slice(0, i + 1))));

/**
 * Sidebar tree. Roots are all tags; the children of a node are the tags
 * co-occurring with its whole path. `expanded` holds the keys of the open
 * nodes (default: just the current path). `activeSets` holds, per active item,
 * the ids of its active tags.
 */
export function sidebarModel(
  tags: Tag[],
  activeSets: string[][],
  path: string[],
  expanded: Set<string> = pathKeys(path),
): TreeNode[] {
  const byId = new Map(tags.map((t) => [t.id, t]));
  const matching = (ids: string[]) =>
    activeSets.filter((s) => ids.every((id) => s.includes(id)));

  const build = (nodePath: string[]): TreeNode => {
    const sets = matching(nodePath);
    const onPath = nodePath.every((id, i) => path[i] === id);
    const co = new Map<string, number>();
    for (const s of sets)
      for (const id of s) if (!nodePath.includes(id)) co.set(id, (co.get(id) ?? 0) + 1);
    // A child covering every item of its parent narrows nothing, so it isn't
    // shown as a sub-branch (unless the current path goes through it).
    const subTags = [...co]
      .filter(([id, n]) => n < sets.length || (onPath && path[nodePath.length] === id))
      .map(([id]) => byId.get(id))
      .filter((t): t is Tag => !!t)
      .sort(byPosition);
    return {
      tag: byId.get(nodePath[nodePath.length - 1])!,
      path: nodePath,
      count: sets.length,
      selected: onPath && nodePath.length === path.length,
      expandable: subTags.length > 0,
      children: expanded.has(nodeKey(nodePath))
        ? subTags.map((t) => build([...nodePath, t.id]))
        : [],
    };
  };

  // Every tag is a root, in the user's manual order.
  return sortTags(tags).map((t) => build([t.id]));
}

export function browseHref(path: string[]) {
  return `/browse?${path.map((id) => `t=${id}`).join("&")}`;
}
