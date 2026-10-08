import { describe, expect, it } from "vitest";
import {
  activeItems,
  browse,
  sidebarModel,
  history,
  pinnedItems,
  type Snapshot,
} from "./tree";

const d = (n: number) => new Date(2026, 0, n);
const tag = (id: string, name: string, isList = false) => ({ id, name, isList });
const item = (id: string, title: string, pinned = false, day = 1) => ({
  id,
  title,
  notes: "",
  pinned,
  createdAt: d(day),
});

// The worked example from the spec.
const base = (): Snapshot => ({
  tags: [
    tag("shop", "Shopping", true),
    tag("k1", "Kid One"),
    tag("k2", "Kid Two"),
  ],
  items: [
    item("chair", "Chair", false, 1),
    item("table", "Table", false, 2),
    item("lesson", "Education Lesson", false, 3),
  ],
  links: [
    { itemId: "chair", tagId: "shop", completedAt: null },
    { itemId: "chair", tagId: "k1", completedAt: null },
    { itemId: "table", tagId: "shop", completedAt: null },
    { itemId: "table", tagId: "k2", completedAt: null },
    { itemId: "lesson", tagId: "k1", completedAt: null },
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

  it("drops an item entirely once every association is complete", () => {
    const snap = base();
    snap.links[0].completedAt = d(5);
    snap.links[1].completedAt = d(5);
    expect(browse(snap, ["shop"]).items.map((i) => i.id)).toEqual(["table"]);
  });
});

describe("home", () => {
  it("pinned items disappear when fully completed", () => {
    const snap = base();
    snap.items[2].pinned = true;
    expect(pinnedItems(snap).map((i) => i.id)).toEqual(["lesson"]);
    snap.links[4].completedAt = d(9);
    expect(pinnedItems(snap)).toEqual([]);
  });
});

describe("sidebarModel", () => {
  const sets = (s: Snapshot) =>
    activeItems(s).map((i) => i.tags.map((t) => t.id));

  it("shows every tag as a root (is_list is ignored) when nothing is selected", () => {
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

  it("hides a sub-tag that covers every item of its parent", () => {
    const s = base();
    // Kid One: Chair + Lesson. Make Shopping cover both (add Lesson to Shopping).
    s.links.push({ itemId: "lesson", tagId: "shop", completedAt: null });
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
