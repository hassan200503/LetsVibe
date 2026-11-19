-- 0013 — chat attachments stay out of the shared gallery.
--
-- A voice note or a photo sent in Messages gets a real `media` row so it uses
-- the same quota, signed URLs and cleanup as everything else, but `origin` keeps
-- it out of gallery pages while the message owns it.

ALTER TABLE "media" ADD COLUMN "origin" text DEFAULT 'gallery' NOT NULL;
