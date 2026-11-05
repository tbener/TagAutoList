-- Per-list item order. Existing associations are numbered per tag by the
-- item's creation date, newest first (today's display order), so nothing jumps.
ALTER TABLE "item_tags" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "item_tags" SET "position" = r.rn
FROM (
	SELECT it."item_id", it."tag_id",
		(row_number() OVER (PARTITION BY it."tag_id" ORDER BY i."created_at" DESC, i."id") - 1)::integer AS rn
	FROM "item_tags" it
	JOIN "items" i ON i."id" = it."item_id"
) r
WHERE "item_tags"."item_id" = r."item_id" AND "item_tags"."tag_id" = r."tag_id";
