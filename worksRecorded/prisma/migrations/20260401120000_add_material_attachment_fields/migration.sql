ALTER TABLE "BISmaterialRecords"
ADD COLUMN IF NOT EXISTS "declarationAttachment" JSONB,
ADD COLUMN IF NOT EXISTS "agreementAttachment" JSONB;
