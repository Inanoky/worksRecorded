CREATE INDEX "sitediaryrecords_site_archived_date_created_idx"
ON "sitediaryrecords"("siteId", "archivedAt", "Date", "createdAt");

CREATE INDEX "photos_site_date_idx"
ON "photos"("siteId", "Date");
