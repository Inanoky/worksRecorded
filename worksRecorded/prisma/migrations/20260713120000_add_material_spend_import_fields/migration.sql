ALTER TABLE "BISmaterialRecords"
  ADD COLUMN IF NOT EXISTS "supplierName" TEXT,
  ADD COLUMN IF NOT EXISTS "importBatchId" TEXT;
