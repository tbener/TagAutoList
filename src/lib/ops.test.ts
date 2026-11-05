import { describe, expect, it } from "vitest";
import * as ops from "./ops";
import { activeItems, sortTags, tagsWithCounts, type Snapshot } from "./tree";

const now = new Date(2026, 5, 1);
const empty = (): Snapshot => ({ tags: [], items: [], links: [] });
let n = 0;
const newId = () => `id${++n}`;

function seeded() {
  const refs = ops.resolveRefs(empty(), ["Shopping", "Kid One"], newId);
  return ops.addItem(ops.addItem(empty(), { id: "x", title: "Chair", refs, now }), {
    id: "y",
    title: "Table",
    refs: refs.slice(0, 1),
    now,
  });
}

describe("ops", () => {
  it("addItem creates missing tags and one link per tag", () => {
    const s = seeded();
    expect(s.tags.map((t) => t.name)).toEqual(["Shopping", "Kid One"]);
    expect(s.links.filter((l) => l.itemId === "x")).toHaveLength(2);
  });

  it("resolveRefs reuses existing tags case-insensitively", () => {
    const s = seeded();
    const [r] = ops.resolveRefs(s, ["  shopping "], newId);
    expect(r).toEqual({ id: s.tags[0].id, name: "Shopping" });
  });

  it("completeItem marks only the given associations", () => {
    const s = seeded();
    const kid = s.tags[1].id;
    const done = ops.completeItem(s, "x", [kid], now);
    const chair = activeItems(done).find((i) => i.id === "x")!;
    expect(chair.tags.map((t) => t.name)).toEqual(["Shopping"]);
    expect(done.links.find((l) => l.itemId === "x" && l.tagId === kid)!.completedAt).toBe(now);
  });

  it("updateItem syncs active tags and reactivates a re-added finished tag", () => {
    const s = seeded();
    const [shop, kid] = s.tags;
    const done = ops.completeItem(s, "x", [kid.id], now);
    const back = ops.updateItem(done, {
      id: "x",
      title: "Chair!",
      notes: "n",
      refs: [shop, kid].map((t) => ({ id: t.id, name: t.name })),
    });
    expect(back.items.find((i) => i.id === "x")).toMatchObject({ title: "Chair!", notes: "n" });
    expect(activeItems(back).find((i) => i.id === "x")!.tags).toHaveLength(2);
    const dropped = ops.updateItem(back, {
      id: "x",
      title: "Chair!",
      notes: "n",
      refs: [{ id: shop.id, name: shop.name }],
    });
    expect(dropped.links.filter((l) => l.itemId === "x")).toHaveLength(1);
  });

  it("deleteTag removes it from items and deletes items left with no tags", () => {
    const s = seeded();
    const [shop, kid] = s.tags;
    const after = ops.deleteTag(s, kid.id);
    expect(after.items.map((i) => i.id).sort()).toEqual(["x", "y"]);
    const after2 = ops.deleteTag(after, shop.id);
    expect(after2.items).toEqual([]);
    expect(after2.links).toEqual([]);
  });

  it("removeItemFromTags removes some associations and keeps the item", () => {
    const s = seeded();
    const [shop, kid] = s.tags;
    const after = ops.removeItemFromTags(s, "x", [kid.id]);
    expect(after.items.map((i) => i.id).sort()).toEqual(["x", "y"]);
    expect(activeItems(after).find((i) => i.id === "x")!.tags.map((t) => t.id)).toEqual([shop.id]);
    expect(after.tags).toHaveLength(2);
  });

  it("removeItemFromTags deletes the item when no active association is left", () => {
    const s = seeded();
    const after = ops.removeItemFromTags(s, "x", s.tags.map((t) => t.id));
    expect(after.items.map((i) => i.id)).toEqual(["y"]);
    expect(after.links.some((l) => l.itemId === "x")).toBe(false);
  });

  it("removeItemFromTags leaves completed history alone unless the item goes", () => {
    const s = seeded();
    const [shop, kid] = s.tags;
    const done = ops.completeItem(s, "x", [kid.id], now);
    // kid is completed, so removing "kid" is a no-op on active links
    const noop = ops.removeItemFromTags(done, "x", [kid.id]);
    expect(noop.links).toEqual(done.links);
    // removing the last active list deletes the item incl. its history
    const gone = ops.removeItemFromTags(done, "x", [shop.id]);
    expect(gone.items.map((i) => i.id)).toEqual(["y"]);
  });

  const order = (s: Snapshot) => sortTags(s.tags).map((t) => t.name);

  it("new tags go to the top, from addItem and addTag alike", () => {
    const s = seeded(); // Shopping, Kid One created in that order
    expect(order(s)).toEqual(["Kid One", "Shopping"]);
    const withTag = ops.addTag(s, { id: "t3", name: "Zebra" });
    expect(order(withTag)).toEqual(["Zebra", "Kid One", "Shopping"]);
    const refs = ops.resolveRefs(withTag, ["Apple", "Shopping"], newId);
    const withItem = ops.addItem(withTag, { id: "z", title: "Z", refs, now });
    expect(order(withItem)).toEqual(["Apple", "Zebra", "Kid One", "Shopping"]);
    expect(ops.addTag({ tags: [], items: [], links: [] }, { id: "a", name: "A" }).tags[0].position).toBe(0);
  });

  it("reorderTags assigns positions in the given order", () => {
    const s = seeded();
    const [shop, kid] = s.tags;
    const re = ops.reorderTags(s, [shop.id, kid.id]);
    expect(order(re)).toEqual(["Shopping", "Kid One"]);
    expect(re.tags.map((t) => t.position).sort()).toEqual([0, 1]);
    // the order is what lists, sub-tags and counts show
    expect(tagsWithCounts(re).map((r) => r.tag.name)).toEqual(["Shopping", "Kid One"]);
    // unknown ids are ignored; tags left out keep their order below
    const partial = ops.reorderTags(s, ["nope", shop.id]);
    expect(order(partial)).toEqual(["Shopping", "Kid One"]);
  });

  it("restoreCompletion reactivates", () => {
    const s = seeded();
    const kid = s.tags[1].id;
    const done = ops.completeItem(s, "x", [kid], now);
    expect(activeItems(ops.restoreCompletion(done, "x", kid)).find((i) => i.id === "x")!.tags).toHaveLength(2);
  });
});
