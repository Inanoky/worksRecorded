ALTER TABLE "sitediaryrecords"
  ADD COLUMN IF NOT EXISTS "saveBatchId" TEXT,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archiveReason" TEXT,
  ADD COLUMN IF NOT EXISTS "archivedByMessageId" TEXT;

CREATE TABLE IF NOT EXISTS "SiteDiarySaveBatch" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceMessageId" TEXT NOT NULL,
  "originalText" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "replacementBatchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "SiteDiarySaveBatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SiteDiarySaveBatch_sourceMessageId_key" ON "SiteDiarySaveBatch"("sourceMessageId");
CREATE INDEX IF NOT EXISTS "SiteDiarySaveBatch_siteId_userId_status_createdAt_idx" ON "SiteDiarySaveBatch"("siteId", "userId", "status", "createdAt");

CREATE TABLE IF NOT EXISTS "SiteDiaryCorrectionSession" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "targetBatchId" TEXT NOT NULL,
  "requestedByMessageId" TEXT NOT NULL,
  "replyToSourceMessageId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteDiaryCorrectionSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SiteDiaryCorrectionSession_requestedByMessageId_key" ON "SiteDiaryCorrectionSession"("requestedByMessageId");
CREATE UNIQUE INDEX IF NOT EXISTS "SiteDiaryCorrectionSession_siteId_userId_key" ON "SiteDiaryCorrectionSession"("siteId", "userId");

CREATE TABLE IF NOT EXISTS "SiteDiaryCorrectionAudit" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "oldBatchId" TEXT NOT NULL,
  "newBatchId" TEXT NOT NULL,
  "correctionMessageId" TEXT NOT NULL,
  "correctionText" TEXT NOT NULL,
  "oldRecordIds" JSONB NOT NULL,
  "newRecordIds" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteDiaryCorrectionAudit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SiteDiaryCorrectionAudit_correctionMessageId_key" ON "SiteDiaryCorrectionAudit"("correctionMessageId");
CREATE INDEX IF NOT EXISTS "sitediaryrecords_saveBatchId_idx" ON "sitediaryrecords"("saveBatchId");
CREATE INDEX IF NOT EXISTS "sitediaryrecords_archivedAt_idx" ON "sitediaryrecords"("archivedAt");
