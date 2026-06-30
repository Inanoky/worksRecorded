ALTER TABLE "sitediaryrecords"
ADD COLUMN IF NOT EXISTS "evalMetadata" JSONB;
