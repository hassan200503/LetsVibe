-- E2-001 — couple_id becomes the single tenant key on every couple-owned table.
--
-- Hand-written on purpose. drizzle-kit could emit the column, the keys and the
-- indexes, but not the backfill, and `ADD COLUMN "couple_id" uuid NOT NULL` with
-- no default fails the moment a table has one row. So the work runs in passes:
-- add the column, fill it from the value the row already carried, then require
-- it. The foreign keys added last are themselves the check — if any couple_id
-- named no real couple the ALTER aborts and the whole file rolls back.
--
-- Verification query, expected 0 for every one of the 18 tables:
--   SELECT count(*) FROM "<table>" t
--   WHERE t."couple_id" IS NULL
--      OR NOT EXISTS (SELECT 1 FROM "couples" c WHERE c."id" = t."couple_id");

-- ─── 1. Drop the couple-scoped indexes, foreign keys and primary keys this replaces ───

DROP INDEX "calls_rel_created";--> statement-breakpoint
DROP INDEX "media_rel_created";--> statement-breakpoint
DROP INDEX "media_rel_kind";--> statement-breakpoint
DROP INDEX "memories_rel_date";--> statement-breakpoint
DROP INDEX "messages_rel_id";--> statement-breakpoint
DROP INDEX "messages_rel_updated";--> statement-breakpoint
DROP INDEX "messages_rel_client";--> statement-breakpoint
DROP INDEX "photos_rel_created";--> statement-breakpoint
DROP INDEX "research_threads_rel_updated";--> statement-breakpoint
DROP INDEX "rituals_rel";--> statement-breakpoint
DROP INDEX "room_events_rel_id";--> statement-breakpoint
DROP INDEX "calls_one_live";--> statement-breakpoint
DROP INDEX "couple_members_active_slot";--> statement-breakpoint
ALTER TABLE "call_signals" DROP CONSTRAINT "call_signals_call_id_calls_id_fk";--> statement-breakpoint
ALTER TABLE "media_comments" DROP CONSTRAINT "media_comments_media_id_media_id_fk";--> statement-breakpoint
ALTER TABLE "media_reactions" DROP CONSTRAINT "media_reactions_media_id_media_id_fk";--> statement-breakpoint
ALTER TABLE "research_messages" DROP CONSTRAINT "research_messages_thread_id_research_threads_id_fk";--> statement-breakpoint
ALTER TABLE "ritual_checks" DROP CONSTRAINT "ritual_checks_ritual_id_rituals_id_fk";--> statement-breakpoint
ALTER TABLE "couple_members" DROP CONSTRAINT "couple_members_relationship_id_person_id_pk";--> statement-breakpoint
ALTER TABLE "daily_answers" DROP CONSTRAINT "daily_answers_relationship_id_day_person_id_pk";--> statement-breakpoint
ALTER TABLE "room_state" DROP CONSTRAINT "room_state_pkey";--> statement-breakpoint

-- ─── 2. Add the column, nullable for now, while every existing row is still there ───

ALTER TABLE "call_signals" ADD COLUMN "couple_id" uuid;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "couple_id" uuid;--> statement-breakpoint
ALTER TABLE "chat_state" ADD COLUMN "couple_id" uuid;--> statement-breakpoint
ALTER TABLE "couple_members" ADD COLUMN "couple_id" uuid;--> statement-breakpoint
ALTER TABLE "daily_answers" ADD COLUMN "couple_id" uuid;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "couple_id" uuid;--> statement-breakpoint
ALTER TABLE "media_comments" ADD COLUMN "couple_id" uuid;--> statement-breakpoint
ALTER TABLE "media_reactions" ADD COLUMN "couple_id" uuid;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "couple_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "couple_id" uuid;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "couple_id" uuid;--> statement-breakpoint
ALTER TABLE "research_messages" ADD COLUMN "couple_id" uuid;--> statement-breakpoint
ALTER TABLE "research_threads" ADD COLUMN "couple_id" uuid;--> statement-breakpoint
ALTER TABLE "ritual_checks" ADD COLUMN "couple_id" uuid;--> statement-breakpoint
ALTER TABLE "rituals" ADD COLUMN "couple_id" uuid;--> statement-breakpoint
ALTER TABLE "room_events" ADD COLUMN "couple_id" uuid;--> statement-breakpoint
ALTER TABLE "room_state" ADD COLUMN "couple_id" uuid;--> statement-breakpoint
ALTER TABLE "shared_learning" ADD COLUMN "couple_id" uuid;--> statement-breakpoint

-- ─── 3. Backfill: a table that already carried relationship_id keeps its own value ───

UPDATE "calls" SET "couple_id" = "relationship_id";--> statement-breakpoint
UPDATE "chat_state" SET "couple_id" = "relationship_id";--> statement-breakpoint
UPDATE "couple_members" SET "couple_id" = "relationship_id";--> statement-breakpoint
UPDATE "daily_answers" SET "couple_id" = "relationship_id";--> statement-breakpoint
UPDATE "media" SET "couple_id" = "relationship_id";--> statement-breakpoint
UPDATE "memories" SET "couple_id" = "relationship_id";--> statement-breakpoint
UPDATE "messages" SET "couple_id" = "relationship_id";--> statement-breakpoint
UPDATE "photos" SET "couple_id" = "relationship_id";--> statement-breakpoint
UPDATE "research_threads" SET "couple_id" = "relationship_id";--> statement-breakpoint
UPDATE "rituals" SET "couple_id" = "relationship_id";--> statement-breakpoint
UPDATE "room_events" SET "couple_id" = "relationship_id";--> statement-breakpoint
UPDATE "room_state" SET "couple_id" = "relationship_id";--> statement-breakpoint
UPDATE "shared_learning" SET "couple_id" = "relationship_id";--> statement-breakpoint

-- ─── 4. …and a child table inherits it from the parent row it already pointed at ───

UPDATE "call_signals" s SET "couple_id" = c."couple_id" FROM "calls" c WHERE c."id" = s."call_id";--> statement-breakpoint
UPDATE "media_comments" m SET "couple_id" = p."couple_id" FROM "media" p WHERE p."id" = m."media_id";--> statement-breakpoint
UPDATE "media_reactions" r SET "couple_id" = p."couple_id" FROM "media" p WHERE p."id" = r."media_id";--> statement-breakpoint
UPDATE "research_messages" m SET "couple_id" = t."couple_id" FROM "research_threads" t WHERE t."id" = m."thread_id";--> statement-breakpoint
UPDATE "ritual_checks" k SET "couple_id" = r."couple_id" FROM "rituals" r WHERE r."id" = k."ritual_id";--> statement-breakpoint

-- ─── 5. Every row now has an answer, so the column can be required ───

ALTER TABLE "call_signals" ALTER COLUMN "couple_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "calls" ALTER COLUMN "couple_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_state" ALTER COLUMN "couple_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "couple_members" ALTER COLUMN "couple_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_answers" ALTER COLUMN "couple_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ALTER COLUMN "couple_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "media_comments" ALTER COLUMN "couple_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "media_reactions" ALTER COLUMN "couple_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "memories" ALTER COLUMN "couple_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "couple_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "photos" ALTER COLUMN "couple_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "research_messages" ALTER COLUMN "couple_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "research_threads" ALTER COLUMN "couple_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ritual_checks" ALTER COLUMN "couple_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "rituals" ALTER COLUMN "couple_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "room_events" ALTER COLUMN "couple_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "room_state" ALTER COLUMN "couple_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shared_learning" ALTER COLUMN "couple_id" SET NOT NULL;--> statement-breakpoint

-- ─── 6. Every couple-owned table now names the couple it belongs to ───

ALTER TABLE "call_signals" ADD CONSTRAINT "call_signals_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_state" ADD CONSTRAINT "chat_state_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "couple_members" ADD CONSTRAINT "couple_members_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_answers" ADD CONSTRAINT "daily_answers_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_comments" ADD CONSTRAINT "media_comments_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_reactions" ADD CONSTRAINT "media_reactions_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_messages" ADD CONSTRAINT "research_messages_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_threads" ADD CONSTRAINT "research_threads_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ritual_checks" ADD CONSTRAINT "ritual_checks_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rituals" ADD CONSTRAINT "rituals_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_events" ADD CONSTRAINT "room_events_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_state" ADD CONSTRAINT "room_state_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_learning" ADD CONSTRAINT "shared_learning_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- ─── 7. Primary keys move off the legacy column ───

ALTER TABLE "couple_members" ADD CONSTRAINT "couple_members_couple_id_person_id_pk" PRIMARY KEY("couple_id","person_id");--> statement-breakpoint
ALTER TABLE "daily_answers" ADD CONSTRAINT "daily_answers_couple_id_day_person_id_pk" PRIMARY KEY("couple_id","day","person_id");--> statement-breakpoint
ALTER TABLE "room_state" ADD CONSTRAINT "room_state_pkey" PRIMARY KEY("couple_id");--> statement-breakpoint

-- ─── 8. Anchors. A unique (id, couple_id) index is what lets a child prove parent
--        and couple in one key in step 9, so it has to exist first ───

CREATE UNIQUE INDEX "calls_id_couple" ON "calls" USING btree ("id","couple_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_id_couple" ON "media" USING btree ("id","couple_id");--> statement-breakpoint
CREATE UNIQUE INDEX "research_threads_id_couple" ON "research_threads" USING btree ("id","couple_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rituals_id_couple" ON "rituals" USING btree ("id","couple_id");--> statement-breakpoint

-- ─── 9. Composite keys. A child row can no longer name a parent from another
--        couple, because the pair has to match the parent's own pair ───

ALTER TABLE "call_signals" ADD CONSTRAINT "call_signals_call_id_couple_id_calls_id_couple_id_fk" FOREIGN KEY ("call_id","couple_id") REFERENCES "public"."calls"("id","couple_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_comments" ADD CONSTRAINT "media_comments_media_id_couple_id_media_id_couple_id_fk" FOREIGN KEY ("media_id","couple_id") REFERENCES "public"."media"("id","couple_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_reactions" ADD CONSTRAINT "media_reactions_media_id_couple_id_media_id_couple_id_fk" FOREIGN KEY ("media_id","couple_id") REFERENCES "public"."media"("id","couple_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_messages" ADD CONSTRAINT "research_messages_thread_id_couple_id_research_threads_id_couple_id_fk" FOREIGN KEY ("thread_id","couple_id") REFERENCES "public"."research_threads"("id","couple_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ritual_checks" ADD CONSTRAINT "ritual_checks_ritual_id_couple_id_rituals_id_couple_id_fk" FOREIGN KEY ("ritual_id","couple_id") REFERENCES "public"."rituals"("id","couple_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- ─── 10. Read-path indexes, every one of them leading with the tenant ───

CREATE INDEX "call_signals_couple_id" ON "call_signals" USING btree ("couple_id","id");--> statement-breakpoint
CREATE INDEX "calls_couple_created" ON "calls" USING btree ("couple_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_state_couple" ON "chat_state" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "media_couple_created" ON "media" USING btree ("couple_id","created_at","id");--> statement-breakpoint
CREATE INDEX "media_couple_kind" ON "media" USING btree ("couple_id","kind","created_at");--> statement-breakpoint
CREATE INDEX "media_comments_couple" ON "media_comments" USING btree ("couple_id","created_at");--> statement-breakpoint
CREATE INDEX "media_reactions_couple" ON "media_reactions" USING btree ("couple_id","created_at");--> statement-breakpoint
CREATE INDEX "memories_couple_date" ON "memories" USING btree ("couple_id","occurred_on");--> statement-breakpoint
CREATE INDEX "messages_couple_id" ON "messages" USING btree ("couple_id","id");--> statement-breakpoint
CREATE INDEX "messages_couple_updated" ON "messages" USING btree ("couple_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_couple_client" ON "messages" USING btree ("couple_id","client_id");--> statement-breakpoint
CREATE INDEX "photos_couple_created" ON "photos" USING btree ("couple_id","created_at");--> statement-breakpoint
CREATE INDEX "research_messages_couple_id" ON "research_messages" USING btree ("couple_id","id");--> statement-breakpoint
CREATE INDEX "research_threads_couple_updated" ON "research_threads" USING btree ("couple_id","updated_at");--> statement-breakpoint
CREATE INDEX "ritual_checks_couple" ON "ritual_checks" USING btree ("couple_id","day");--> statement-breakpoint
CREATE INDEX "rituals_couple" ON "rituals" USING btree ("couple_id","position","created_at");--> statement-breakpoint
CREATE INDEX "room_events_couple_id" ON "room_events" USING btree ("couple_id","id");--> statement-breakpoint
CREATE INDEX "shared_learning_couple" ON "shared_learning" USING btree ("couple_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "calls_one_live" ON "calls" USING btree ("couple_id") WHERE status in ('calling', 'ringing', 'active');--> statement-breakpoint
CREATE UNIQUE INDEX "couple_members_active_slot" ON "couple_members" USING btree ("couple_id","slot") WHERE "couple_members"."status" = 'active';
