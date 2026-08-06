ALTER TABLE "photos"
  ADD COLUMN IF NOT EXISTS "mediaPurpose" TEXT DEFAULT 'site_diary';

CREATE INDEX IF NOT EXISTS "photos_site_purpose_date_idx"
  ON "photos"("siteId", "mediaPurpose", "Date");
