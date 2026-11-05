import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Keyed by the Google account `sub`. */
export const users = pgTable("users", {
  id: text().primaryKey(),
  email: text().notNull(),
  name: text(),
  image: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * The single entity behind every list/tag. `position` is the user's manual
 * order (lower = higher up; new tags go to the top; ties fall back to name). Tags store no
 * relationship to each other — structure is derived from items (see lib/tree.ts).
 */
export const tags = pgTable(
  "tags",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    position: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tags_user_name_idx").on(t.userId, sql`lower(${t.name})`)],
);

export const items = pgTable(
  "items",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text().notNull(),
    notes: text().notNull().default(""),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("items_user_idx").on(t.userId)],
);

/**
 * Many-to-many join. Completion lives here, per association: a non-null
 * `completedAt` means "done under this tag" and is kept for history.
 * `position` is the item's manual order *within this tag* (per list).
 */
export const itemTags = pgTable(
  "item_tags",
  {
    itemId: uuid()
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    completedAt: timestamp({ withTimezone: true }),
    /** Order of this item within this tag's list (lower = higher up). */
    position: integer().notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.itemId, t.tagId] }),
    index("item_tags_tag_idx").on(t.tagId),
  ],
);
