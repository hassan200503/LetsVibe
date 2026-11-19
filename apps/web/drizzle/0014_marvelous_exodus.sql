CREATE TABLE "auth_attempts" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "recovery_hash" text;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "auth_attempts_reset" ON "auth_attempts" USING btree ("reset_at");--> statement-breakpoint
CREATE UNIQUE INDEX "people_email_lower" ON "people" USING btree (lower("email")) WHERE "people"."email" is not null;