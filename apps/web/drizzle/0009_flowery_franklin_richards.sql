CREATE TABLE "ritual_checks" (
	"ritual_id" uuid NOT NULL,
	"day" date NOT NULL,
	"person_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ritual_checks_ritual_id_day_person_id_pk" PRIMARY KEY("ritual_id","day","person_id")
);
--> statement-breakpoint
CREATE TABLE "rituals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"relationship_id" uuid NOT NULL,
	"created_by" uuid,
	"title" text NOT NULL,
	"detail" text,
	"emoji" text DEFAULT '✷' NOT NULL,
	"cadence" text DEFAULT 'daily' NOT NULL,
	"at_time" text,
	"position" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rituals_cadence_check" CHECK ("rituals"."cadence" in ('daily', 'weekly')),
	CONSTRAINT "rituals_title_check" CHECK (char_length("rituals"."title") between 1 and 80),
	CONSTRAINT "rituals_time_check" CHECK ("rituals"."at_time" is null or "rituals"."at_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
--> statement-breakpoint
ALTER TABLE "ritual_checks" ADD CONSTRAINT "ritual_checks_ritual_id_rituals_id_fk" FOREIGN KEY ("ritual_id") REFERENCES "public"."rituals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ritual_checks" ADD CONSTRAINT "ritual_checks_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rituals" ADD CONSTRAINT "rituals_relationship_id_couples_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rituals" ADD CONSTRAINT "rituals_created_by_people_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ritual_checks_day" ON "ritual_checks" USING btree ("day","ritual_id");--> statement-breakpoint
CREATE INDEX "rituals_rel" ON "rituals" USING btree ("relationship_id","position","created_at");