CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"couple_id" uuid PRIMARY KEY NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"storage_bytes" bigint DEFAULT 1073741824 NOT NULL,
	"ai_questions_per_month" integer DEFAULT 100 NOT NULL,
	"rooms" smallint DEFAULT 1 NOT NULL,
	"exports_per_month" integer DEFAULT 3 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitlements_plan_check" CHECK ("entitlements"."plan" in ('free', 'premium')),
	CONSTRAINT "entitlements_storage_check" CHECK ("entitlements"."storage_bytes" > 0),
	CONSTRAINT "entitlements_ai_check" CHECK ("entitlements"."ai_questions_per_month" >= 0),
	CONSTRAINT "entitlements_rooms_check" CHECK ("entitlements"."rooms" >= 0),
	CONSTRAINT "entitlements_exports_check" CHECK ("entitlements"."exports_per_month" >= 0)
);
--> statement-breakpoint
CREATE TABLE "usage_ledger" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"couple_id" uuid NOT NULL,
	"metric" text NOT NULL,
	"period" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"source_id" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usage_ledger_metric_check" CHECK ("usage_ledger"."metric" in ('ai_question', 'export')),
	CONSTRAINT "usage_ledger_period_check" CHECK ("usage_ledger"."period" ~ '^[0-9]{4}-[0-9]{2}$'),
	CONSTRAINT "usage_ledger_quantity_check" CHECK ("usage_ledger"."quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_created_by_people_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_target" ON "audit_log" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "usage_ledger_couple_period" ON "usage_ledger" USING btree ("couple_id","metric","period");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_ledger_source" ON "usage_ledger" USING btree ("couple_id","metric","source_id") WHERE "usage_ledger"."source_id" is not null;--> statement-breakpoint
INSERT INTO "entitlements" ("couple_id") SELECT "id" FROM "couples" ON CONFLICT DO NOTHING;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "audit_log_append_only"() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "audit_log_no_update" BEFORE UPDATE OR DELETE ON "audit_log" FOR EACH ROW EXECUTE FUNCTION "audit_log_append_only"();