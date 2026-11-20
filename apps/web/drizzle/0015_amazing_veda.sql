ALTER TABLE "media" ADD COLUMN "collection" text;--> statement-breakpoint
CREATE INDEX "media_couple_collection" ON "media" USING btree ("couple_id","collection","created_at");