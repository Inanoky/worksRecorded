ALTER TABLE "photos" ADD COLUMN "diaryRecordId" TEXT;

CREATE UNIQUE INDEX "photos_diary_record_file_url_key"
ON "photos"("diaryRecordId", "fileUrl");

ALTER TABLE "photos" ADD CONSTRAINT "photos_diaryRecordId_fkey"
FOREIGN KEY ("diaryRecordId") REFERENCES "sitediaryrecords"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
