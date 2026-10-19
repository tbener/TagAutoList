import { describe, expect, it } from "vitest";
import * as ops from "./ops";
import { activeItems, type Snapshot } from "./tree";

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

  it("restoreCompletion reactivates", () => {
    const s = seeded();
    const kid = s.tags[1].id;
    const done = ops.completeItem(s, "x", [kid], now);
    expect(activeItems(ops.restoreCompletion(done, "x", kid)).find((i) => i.id === "x")!.tags).toHaveLength(2);
  });
});
