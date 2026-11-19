ALTER TABLE "calls" DROP CONSTRAINT "calls_relationship_id_couples_id_fk";
--> statement-breakpoint
ALTER TABLE "chat_state" DROP CONSTRAINT "chat_state_relationship_id_couples_id_fk";
--> statement-breakpoint
ALTER TABLE "couple_members" DROP CONSTRAINT "couple_members_relationship_id_couples_id_fk";
--> statement-breakpoint
ALTER TABLE "daily_answers" DROP CONSTRAINT "daily_answers_relationship_id_couples_id_fk";
--> statement-breakpoint
ALTER TABLE "media" DROP CONSTRAINT "media_relationship_id_couples_id_fk";
--> statement-breakpoint
ALTER TABLE "memories" DROP CONSTRAINT "memories_relationship_id_couples_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_relationship_id_couples_id_fk";
--> statement-breakpoint
ALTER TABLE "photos" DROP CONSTRAINT "photos_relationship_id_couples_id_fk";
--> statement-breakpoint
ALTER TABLE "research_threads" DROP CONSTRAINT "research_threads_relationship_id_couples_id_fk";
--> statement-breakpoint
ALTER TABLE "rituals" DROP CONSTRAINT "rituals_relationship_id_couples_id_fk";
--> statement-breakpoint
ALTER TABLE "room_events" DROP CONSTRAINT "room_events_relationship_id_couples_id_fk";
--> statement-breakpoint
ALTER TABLE "room_state" DROP CONSTRAINT "room_state_relationship_id_couples_id_fk";
--> statement-breakpoint
ALTER TABLE "shared_learning" DROP CONSTRAINT "shared_learning_relationship_id_couples_id_fk";
--> statement-breakpoint
ALTER TABLE "calls" DROP COLUMN "relationship_id";--> statement-breakpoint
ALTER TABLE "chat_state" DROP COLUMN "relationship_id";--> statement-breakpoint
ALTER TABLE "couple_members" DROP COLUMN "relationship_id";--> statement-breakpoint
ALTER TABLE "daily_answers" DROP COLUMN "relationship_id";--> statement-breakpoint
ALTER TABLE "media" DROP COLUMN "relationship_id";--> statement-breakpoint
ALTER TABLE "memories" DROP COLUMN "relationship_id";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "relationship_id";--> statement-breakpoint
ALTER TABLE "photos" DROP COLUMN "relationship_id";--> statement-breakpoint
ALTER TABLE "research_threads" DROP COLUMN "relationship_id";--> statement-breakpoint
ALTER TABLE "rituals" DROP COLUMN "relationship_id";--> statement-breakpoint
ALTER TABLE "room_events" DROP COLUMN "relationship_id";--> statement-breakpoint
ALTER TABLE "room_state" DROP COLUMN "relationship_id";--> statement-breakpoint
ALTER TABLE "shared_learning" DROP COLUMN "relationship_id";