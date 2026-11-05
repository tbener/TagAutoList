-- Manual list order. Existing tags are numbered per user in their current
-- alphabetical (case-insensitive) order so nothing jumps; then is_list is dropped.
ALTER TABLE "tags" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "tags" SET "position" = r.rn
FROM (
	SELECT "id", (row_number() OVER (PARTITION BY "user_id" ORDER BY lower("name"), "name") - 1)::integer AS rn
	FROM "tags"
) r
WHERE "tags"."id" = r."id";--> statement-breakpoint
ALTER TABLE "tags" DROP COLUMN "is_list";
