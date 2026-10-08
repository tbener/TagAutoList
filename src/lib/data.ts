import { eq, inArray } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { itemTags, items, tags } from "@/db/schema";
import type { Snapshot } from "./tree";

/**
 * Everything a user owns, in three queries. A personal task list is small, so
 * the tree/co-occurrence views are computed in memory (lib/tree.ts) rather than
 * with bespoke SQL per view.
 */
export const getSnapshot = cache(async function getSnapshot(
  userId: string,
): Promise<Snapshot> {
  const [tagRows, itemRows] = await Promise.all([
    db
      .select({ id: tags.id, name: tags.name, isList: tags.isList })
      .from(tags)
      .where(eq(tags.userId, userId)),
    db
      .select({
        id: items.id,
        title: items.title,
        notes: items.notes,
        pinned: items.pinned,
        createdAt: items.createdAt,
      })
      .from(items)
      .where(eq(items.userId, userId)),
  ]);
  const linkRows = tagRows.length
    ? await db
        .select()
        .from(itemTags)
        .where(
          inArray(
            itemTags.tagId,
            tagRows.map((t) => t.id),
          ),
        )
    : [];
  return { tags: tagRows, items: itemRows, links: linkRows };
});
