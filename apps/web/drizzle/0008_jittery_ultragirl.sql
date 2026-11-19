ALTER TABLE "usage_ledger" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD COLUMN "prompt_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD COLUMN "completion_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD COLUMN "total_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD COLUMN "cost_micros" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_tokens_check" CHECK ("usage_ledger"."prompt_tokens" >= 0 and "usage_ledger"."completion_tokens" >= 0 and "usage_ledger"."total_tokens" >= 0 and "usage_ledger"."cost_micros" >= 0);