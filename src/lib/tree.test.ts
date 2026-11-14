import { describe, expect, it } from "vitest";
import {
  activeItems,
  browse,
  sidebarModel,
  history,
  onlyOnPath,
  rootTags,
  sidebarPath,
  branchSuggestions,
  type Snapshot,
} from "./tree";

const d = (n: number) => new Date(2026, 0, n);
const tag = (id: string, name: string, position = 0, parentId: string | null = null) => ({
  id,
  name,
  position,
  parentId,
});
const link = (itemId: string, tagId: string, position = 0) => ({
  itemId,
  tagId,
  completedAt: null,
  position,
});
const item = (id: string, title: string, day = 1) => ({
  id,
  title,
  notes: "",
  createdAt: d(day),
});

// The worked example from the spec.
const base = (): Snapshot => ({
  tags: [
    tag("shop", "Shopping"),
    tag("k1", "Kid One"),
    tag("k2", "Kid Two"),
  ],
  items: [
    item("chair", "Chair", 1),
    item("table", "Table", 2),
    item("lesson", "Education Lesson", 3),
  ],
  links: [
    link("chair", "shop"),
    link("chair", "k1"),
    link("table", "shop"),
    link("table", "k2"),
    link("lesson", "k1"),
  ],
});

describe("browse", () => {
  it("Kid One shows Chair + Lesson and Shopping, but not Kid Two", () => {
    const { items, subTags } = browse(base(), ["k1"]);
    expect(items.map((i) => i.title).sort()).toEqual([
      "Chair",
      "Education Lesson",
    ]);
    expect(subTags.map((s) => s.tag.name)).toEqual(["Shopping"]);
  });

  it("is symmetric: Shopping shows Kid One and Kid Two", () => {
    const { subTags } = browse(base(), ["shop"]);
    expect(subTags.map((s) => s.tag.name)).toEqual(["Kid One", "Kid Two"]);
  });

  it("filters to the intersection", () => {
    const { items, subTags } = browse(base(), ["k1", "shop"]);
    expect(items.map((i) => i.title)).toEqual(["Chair"]);
    expect(subTags).toEqual([]);
  });

  it("hides completed associations and the tags that only co-occur through them", () => {
    const snap = base();
    snap.links[1].completedAt = d(5); // Chair done under Kid One
    const kidOne = browse(snap, ["k1"]);
    expect(kidOne.items.map((i) => i.title)).toEqual(["Education Lesson"]);
    expect(kidOne.subTags).toEqual([]);
    // Chair is still active under Shopping, now without the Kid One tag.
    const shop = browse(snap, ["shop"]);
    const chair = shop.items.find((i) => i.id === "chair")!;
    expect(chair.tags.map((t) => t.name)).toEqual(["Shopping"]);
  });

  it("orders items by the first tag of the path; ties fall back to newest first", () => {
    const snap = base();
    // Shopping: Chair (day 1) pinned above Table (day 2)
    snap.links[0].position = 0; // chair/shop
    snap.links[2].position = 1; // table/shop
    expect(browse(snap, ["shop"]).items.map((i) => i.id)).toEqual(["chair", "table"]);
    // Kid One: Lesson (day 3) and Chair (day 1) both 0 → newest first
    expect(browse(snap, ["k1"]).items.map((i) => i.id)).toEqual(["lesson", "chair"]);
    // reordering in Shopping does not change Kid One; and a drilled-down path
    // follows its first tag
    snap.links[1].position = -1; // chair/k1 above lesson
    expect(browse(snap, ["k1"]).items.map((i) => i.id)).toEqual(["chair", "lesson"]);
    expect(browse(snap, ["shop", "k1"]).items.map((i) => i.id)).toEqual(["chair"]);
    snap.links.push(link("lesson", "shop", -5));
    expect(browse(snap, ["shop", "k1"]).items.map((i) => i.id)).toEqual(["lesson", "chair"]);
    expect(browse(snap, ["k1", "shop"]).items.map((i) => i.id)).toEqual(["chair", "lesson"]);
  });

  it("drops an item entirely once every association is complete", () => {
    const snap = base();
    snap.links[0].completedAt = d(5);
    snap.links[1].completedAt = d(5);
    expect(browse(snap, ["shop"]).items.map((i) => i.id)).toEqual(["table"]);
  });
});

describe("sidebarModel", () => {
  const sets = (s: Snapshot) =>
    activeItems(s).map((i) => i.tags.map((t) => t.id));

  it("shows every tag as a root when nothing is selected", () => {
    const s = base();
    const roots = sidebarModel(s.tags, sets(s), []);
    expect(roots.map((r) => [r.tag.name, r.count, r.children.length])).toEqual([
      ["Kid One", 2, 0],
      ["Kid Two", 1, 0],
      ["Shopping", 2, 0],
    ]);
  });

  it("expands the selected node with co-occurring lists, then narrows", () => {
    const s = base();
    const shop = sidebarModel(s.tags, sets(s), ["shop"]).find((r) => r.tag.id === "shop")!;
    expect(shop.selected).toBe(true);
    expect(shop.children.map((c) => [c.tag.name, c.count])).toEqual([
      ["Kid One", 1],
      ["Kid Two", 1],
    ]);
    const shop2 = sidebarModel(s.tags, sets(s), ["shop", "k1"]).find((r) => r.tag.id === "shop")!;
    expect(shop2.selected).toBe(false);
    const kid = shop2.children.find((c) => c.tag.id === "k1")!;
    expect(kid.selected).toBe(true);
    expect(kid.children).toEqual([]);
  });

  it("flags expandable nodes without opening them, and honours the expanded set", () => {
    const s = base();
    const roots = sidebarModel(s.tags, sets(s), []);
    const shop = roots.find((r) => r.tag.id === "shop")!;
    const kid1 = roots.find((r) => r.tag.id === "k1")!;
    const kid2 = roots.find((r) => r.tag.id === "k2")!;
    expect(shop.expandable).toBe(true);
    expect(shop.children).toEqual([]); // closed
    expect(kid1.expandable).toBe(true); // Shopping covers only part of Kid One
    expect(kid2.expandable).toBe(false); // Shopping covers all of Kid Two → hidden
    const opened = sidebarModel(s.tags, sets(s), [], new Set(["shop"]));
    const shopOpen = opened.find((r) => r.tag.id === "shop")!;
    expect(shopOpen.children.map((c) => c.tag.name)).toEqual(["Kid One", "Kid Two"]);
    // second level is known to be expandable-or-not before it is opened
    expect(shopOpen.children.every((c) => c.expandable === false)).toBe(true);
  });

  it("hides a sub-tag that covers every item of its parent", () => {
    const s = base();
    // Kid One: Chair + Lesson. Make Shopping cover both (add Lesson to Shopping).
    s.links.push(link("lesson", "shop"));
    const kid = sidebarModel(s.tags, sets(s), ["k1"]).find((r) => r.tag.id === "k1")!;
    expect(kid.children).toEqual([]); // Shopping == all of Kid One's items
    // ...but Shopping still lists Kid One (it covers only 2 of Shopping's 3).
    const shop = sidebarModel(s.tags, sets(s), ["shop"]).find((r) => r.tag.id === "shop")!;
    expect(shop.children.map((c) => c.tag.name)).toEqual(["Kid One", "Kid Two"]);
    // A node on the current path is kept so the selection doesn't vanish.
    const kept = sidebarModel(s.tags, sets(s), ["k1", "shop"]).find((r) => r.tag.id === "k1")!;
    expect(kept.children.map((c) => c.tag.name)).toEqual(["Shopping"]);
  });

  it("expands a formerly non-list tag like any other", () => {
    const s = base();
    const roots = sidebarModel(s.tags, sets(s), ["k1"]);
    expect(roots.map((r) => r.tag.name)).toEqual(["Kid One", "Kid Two", "Shopping"]);
    expect(roots[0].children.map((c) => c.tag.name)).toEqual(["Shopping"]);
  });
});

describe("history", () => {
  it("returns completed associations for a tag, newest first", () => {
    const snap = base();
    snap.links[1].completedAt = d(5);
    snap.links[4].completedAt = d(7);
    expect(history(snap, "k1").map((h) => h.title)).toEqual([
      "Education Lesson",
      "Chair",
    ]);
  });
});


describe("onlyOnPath (Only this list)", () => {
  const snap = (): Snapshot => {
    const b = base();
    return {
      ...b,
      items: [...b.items, item("milk", "Milk", 4)],
      links: [...b.links, link("milk", "shop")],
    };
  };

  it("in Shopping keeps Milk and hides Chair and Table", () => {
    const { items } = browse(snap(), ["shop"]);
    expect(items.map((i) => i.title).sort()).toEqual(["Chair", "Milk", "Table"]);
    expect(onlyOnPath(items, ["shop"]).map((i) => i.title)).toEqual(["Milk"]);
  });

  it("in Shopping > Kid One keeps only items with exactly those two lists", () => {
    const s = snap();
    s.items.push(item("rug", "Rug", 5));
    s.links.push(link("rug", "shop"), link("rug", "k1"));
    s.links.push(link("chair", "k2")); // Chair now has three lists
    const { items } = browse(s, ["shop", "k1"]);
    expect(items.map((i) => i.title).sort()).toEqual(["Chair", "Rug"]);
    expect(onlyOnPath(items, ["shop", "k1"]).map((i) => i.title)).toEqual(["Rug"]);
  });

  it("ignores completed associations (they are history, not other lists)", () => {
    const s = snap();
    s.links = s.links.map((l) =>
      l.itemId === "chair" && l.tagId === "k1" ? { ...l, completedAt: d(9) } : l,
    );
    const { items } = browse(s, ["shop"]);
    expect(onlyOnPath(items, ["shop"]).map((i) => i.title).sort()).toEqual(["Chair", "Milk"]);
  });

  it("does not change what browse() offers as sub-branches", () => {
    const { subTags } = browse(snap(), ["shop"]);
    expect(subTags.map((s) => s.tag.name).sort()).toEqual(["Kid One", "Kid Two"]);
  });
});

describe("nested lists", () => {
  // Groceries is nested under Shopping; Kid One / Kid Two stay top level.
  const nested = (): Snapshot => {
    const b = base();
    return {
      ...b,
      tags: [...b.tags, tag("groc", "Groceries", 5, "shop")],
      items: [...b.items, item("eggs", "Eggs", 4)],
      links: [...b.links, link("eggs", "groc"), link("eggs", "shop")],
    };
  };
  const sets = (s: Snapshot) => activeItems(s).map((i) => i.tags.map((t) => t.id));

  it("rootTags / the sidebar roots leave nested lists out", () => {
    const s = nested();
    expect(rootTags(s.tags).map((t) => t.name).sort()).toEqual(["Kid One", "Kid Two", "Shopping"]);
    expect(sidebarModel(s.tags, sets(s), []).map((n) => n.tag.name).sort()).toEqual([
      "Kid One",
      "Kid Two",
      "Shopping",
    ]);
  });

  it("a parent node always lists its nested lists, even an empty one", () => {
    const s = nested();
    s.links = s.links.filter((l) => l.tagId !== "groc"); // Groceries is now empty
    const shop = sidebarModel(s.tags, sets(s), ["shop"], new Set(["shop"])).find((n) => n.tag.id === "shop")!;
    expect(shop.children.map((c) => c.tag.name)).toContain("Groceries");
    expect(shop.children.find((c) => c.tag.id === "groc")!.count).toBe(0);
  });

  it("is not hidden by the covers-every-item rule", () => {
    // Every Shopping item is also in Groceries.
    const s: Snapshot = {
      tags: [tag("shop", "Shopping"), tag("groc", "Groceries", 1, "shop")],
      items: [item("a", "A"), item("b", "B")],
      links: [link("a", "shop"), link("a", "groc"), link("b", "shop"), link("b", "groc")],
    };
    const shop = sidebarModel(s.tags, sets(s), [], new Set(["shop"]))[0];
    expect(shop.children.map((c) => c.tag.id)).toEqual(["groc"]);
    expect(shop.expandable).toBe(true);
  });

  it("deeper down, nested lists follow the normal co-occurrence rule", () => {
    const s = nested();
    const node = sidebarModel(s.tags, sets(s), ["k1"], new Set(["k1"])).find((n) => n.tag.id === "k1")!;
    // Kid One has no Groceries items, so Groceries is not offered under it.
    expect(node.children.map((c) => c.tag.id)).not.toContain("groc");
  });

  it("sidebarPath shows a nested list under its parent", () => {
    const s = nested();
    expect(sidebarPath(s.tags, ["groc"])).toEqual(["shop", "groc"]);
    expect(sidebarPath(s.tags, ["groc", "k1"])).toEqual(["shop", "groc", "k1"]);
    expect(sidebarPath(s.tags, ["shop", "groc"])).toEqual(["shop", "groc"]);
    expect(sidebarPath(s.tags, ["k1"])).toEqual(["k1"]);
    const tree = sidebarModel(s.tags, sets(s), sidebarPath(s.tags, ["groc"]), new Set(["shop"]));
    const shop = tree.find((n) => n.tag.id === "shop")!;
    expect(shop.children.find((c) => c.tag.id === "groc")!.selected).toBe(true);
  });

  it("branchSuggestions adds a parent's nested lists (count 0 when empty)", () => {
    const s = nested();
    s.links = s.links.filter((l) => l.tagId !== "groc");
    const { items, subTags } = browse(s, ["shop"]);
    const sug = branchSuggestions(s.tags, ["shop"], items.length, subTags);
    expect(sug.find((x) => x.tag.id === "groc")!.count).toBe(0);
    // Not forced in for a deeper path.
    const { items: i2, subTags: st2 } = browse(s, ["shop", "k1"]);
    expect(branchSuggestions(s.tags, ["shop", "k1"], i2.length, st2).some((x) => x.tag.id === "groc")).toBe(false);
  });

  it("browse of the nested list on its own still works", () => {
    const { items } = browse(nested(), ["groc"]);
    expect(items.map((i) => i.title)).toEqual(["Eggs"]);
  });
});
