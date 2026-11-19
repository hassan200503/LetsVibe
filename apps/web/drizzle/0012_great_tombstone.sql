-- 0012 — couple-scoped member slugs and the opt-in public handle.
--
-- `people.slug` stays the account handle: it is half of what signs you in, so
-- it stays globally unique and stops appearing in URLs. The slug that appears
-- in links (`/world/<slug>`, `/discover?as=`) moves to `couple_members`, where
-- it is unique per couple — two couples can both have an "alex".
--
-- Public profiles get their own opaque handle instead of reusing either slug,
-- so a public URL discloses neither an account handle nor a member slug.

ALTER TABLE "couple_members" ADD COLUMN "slug" text;--> statement-breakpoint
UPDATE "couple_members" SET "slug" = "people"."slug" FROM "people" WHERE "people"."id" = "couple_members"."person_id" AND "couple_members"."slug" is null;--> statement-breakpoint
ALTER TABLE "couple_members" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "public_handle" text;--> statement-breakpoint
UPDATE "people" SET "public_handle" = 'p_' || substr(md5("id"::text || random()::text || clock_timestamp()::text), 1, 22) WHERE "public_profile" = true AND "public_handle" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "couple_members_couple_slug" ON "couple_members" USING btree ("couple_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "people_public_handle" ON "people" USING btree ("public_handle");--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_public_handle_check" CHECK ("people"."public_profile" = false or "people"."public_handle" is not null);
