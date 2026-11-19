ALTER TABLE "relationship_members" RENAME TO "couple_members";--> statement-breakpoint
ALTER TABLE "relationships" RENAME TO "couples";--> statement-breakpoint
ALTER TABLE "couples" RENAME CONSTRAINT "relationships_pkey" TO "couples_pkey";--> statement-breakpoint
ALTER TABLE "couple_members" RENAME CONSTRAINT "relationship_members_relationship_id_person_id_pk" TO "couple_members_relationship_id_person_id_pk";--> statement-breakpoint
ALTER TABLE "couple_members" RENAME CONSTRAINT "relationship_members_relationship_id_relationships_id_fk" TO "couple_members_relationship_id_couples_id_fk";--> statement-breakpoint
ALTER TABLE "couple_members" RENAME CONSTRAINT "relationship_members_person_id_people_id_fk" TO "couple_members_person_id_people_id_fk";--> statement-breakpoint
ALTER TABLE "calls" RENAME CONSTRAINT "calls_relationship_id_relationships_id_fk" TO "calls_relationship_id_couples_id_fk";--> statement-breakpoint
ALTER TABLE "chat_state" RENAME CONSTRAINT "chat_state_relationship_id_relationships_id_fk" TO "chat_state_relationship_id_couples_id_fk";--> statement-breakpoint
ALTER TABLE "daily_answers" RENAME CONSTRAINT "daily_answers_relationship_id_relationships_id_fk" TO "daily_answers_relationship_id_couples_id_fk";--> statement-breakpoint
ALTER TABLE "media" RENAME CONSTRAINT "media_relationship_id_relationships_id_fk" TO "media_relationship_id_couples_id_fk";--> statement-breakpoint
ALTER TABLE "memories" RENAME CONSTRAINT "memories_relationship_id_relationships_id_fk" TO "memories_relationship_id_couples_id_fk";--> statement-breakpoint
ALTER TABLE "messages" RENAME CONSTRAINT "messages_relationship_id_relationships_id_fk" TO "messages_relationship_id_couples_id_fk";--> statement-breakpoint
ALTER TABLE "photos" RENAME CONSTRAINT "photos_relationship_id_relationships_id_fk" TO "photos_relationship_id_couples_id_fk";--> statement-breakpoint
ALTER TABLE "research_threads" RENAME CONSTRAINT "research_threads_relationship_id_relationships_id_fk" TO "research_threads_relationship_id_couples_id_fk";--> statement-breakpoint
ALTER TABLE "room_events" RENAME CONSTRAINT "room_events_relationship_id_relationships_id_fk" TO "room_events_relationship_id_couples_id_fk";--> statement-breakpoint
ALTER TABLE "room_state" RENAME CONSTRAINT "room_state_relationship_id_relationships_id_fk" TO "room_state_relationship_id_couples_id_fk";--> statement-breakpoint
ALTER TABLE "shared_learning" RENAME CONSTRAINT "shared_learning_relationship_id_relationships_id_fk" TO "shared_learning_relationship_id_couples_id_fk";--> statement-breakpoint
ALTER TABLE "couple_members" ADD COLUMN "slot" smallint;--> statement-breakpoint
ALTER TABLE "couple_members" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "couple_members" ADD COLUMN "joined_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "couple_members" AS cm
SET "slot" = ranked."slot"
FROM (
  SELECT "relationship_id", "person_id", row_number() OVER (PARTITION BY "relationship_id" ORDER BY "person_id")::smallint AS "slot"
  FROM "couple_members"
) AS ranked
WHERE cm."relationship_id" = ranked."relationship_id" AND cm."person_id" = ranked."person_id";--> statement-breakpoint
ALTER TABLE "couple_members" ALTER COLUMN "slot" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "couple_members" ADD CONSTRAINT "couple_members_slot_check" CHECK ("couple_members"."slot" in (1, 2));--> statement-breakpoint
ALTER TABLE "couple_members" ADD CONSTRAINT "couple_members_status_check" CHECK ("couple_members"."status" in ('active', 'left'));--> statement-breakpoint
CREATE UNIQUE INDEX "couple_members_active_slot" ON "couple_members" USING btree ("relationship_id","slot") WHERE "couple_members"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "couple_members_active_person" ON "couple_members" USING btree ("person_id") WHERE "couple_members"."status" = 'active';--> statement-breakpoint
CREATE INDEX "couple_members_person" ON "couple_members" USING btree ("person_id");--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"couple_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_by" uuid,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_acceptance_pair" CHECK (("invitations"."accepted_at" is null) = ("invitations"."accepted_by" is null)),
	CONSTRAINT "invitations_expiry_after_creation" CHECK ("invitations"."expires_at" > "invitations"."created_at")
);--> statement-breakpoint
CREATE TABLE "profiles" (
	"person_id" uuid PRIMARY KEY NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"version" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
INSERT INTO "profiles" ("person_id", "timezone", "locale", "onboarding_completed_at", "created_at", "updated_at")
SELECT "id", 'Africa/Nairobi', 'en', "created_at", "created_at", "created_at" FROM "people";--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_created_by_people_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_by_people_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_hash" ON "invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "invitations_couple_created" ON "invitations" USING btree ("couple_id","created_at");--> statement-breakpoint
CREATE INDEX "invitations_pending" ON "invitations" USING btree ("couple_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "consents_person_kind_version" ON "consents" USING btree ("person_id","kind","version");--> statement-breakpoint
CREATE INDEX "consents_person_accepted" ON "consents" USING btree ("person_id","accepted_at");
