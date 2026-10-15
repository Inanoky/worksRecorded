BEGIN;

-- CreateTable
CREATE TABLE "FimaImportBatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "source" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FimaImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FimaWorkRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "batchId" TEXT,
    "proposal" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "bisId" TEXT,
    "bisCaseId" TEXT,
    "bisStatus" TEXT,
    "managed" BOOLEAN NOT NULL DEFAULT false,
    "snapshot" JSONB,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FimaWorkRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FimaWorkRevision" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FimaWorkRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FimaBisOperation" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "dedupeKey" TEXT,
    "actorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FimaBisOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FimaWorkTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workKey" TEXT NOT NULL,
    "sourceWork" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FimaWorkTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FimaImportBatch_organizationId_siteId_fileHash_key" ON "FimaImportBatch"("organizationId", "siteId", "fileHash");

-- CreateIndex
CREATE INDEX "FimaWorkRecord_organizationId_siteId_stage_idx" ON "FimaWorkRecord"("organizationId", "siteId", "stage");

-- CreateIndex
CREATE INDEX "FimaWorkRecord_bisCaseId_bisId_idx" ON "FimaWorkRecord"("bisCaseId", "bisId");

-- CreateIndex
CREATE UNIQUE INDEX "FimaWorkRecord_organizationId_localId_key" ON "FimaWorkRecord"("organizationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "FimaWorkRecord_organizationId_ordinal_key" ON "FimaWorkRecord"("organizationId", "ordinal");

-- CreateIndex
CREATE INDEX "FimaWorkRevision_recordId_createdAt_idx" ON "FimaWorkRevision"("recordId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FimaBisOperation_requestKey_key" ON "FimaBisOperation"("requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "FimaBisOperation_dedupeKey_key" ON "FimaBisOperation"("dedupeKey");

-- CreateIndex
CREATE INDEX "FimaBisOperation_organizationId_status_createdAt_idx" ON "FimaBisOperation"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FimaWorkTemplate_organizationId_workKey_key" ON "FimaWorkTemplate"("organizationId", "workKey");

-- AddForeignKey
ALTER TABLE "FimaWorkRecord" ADD CONSTRAINT "FimaWorkRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "FimaImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FimaWorkRevision" ADD CONSTRAINT "FimaWorkRevision_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "FimaWorkRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FimaBisOperation" ADD CONSTRAINT "FimaBisOperation_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "FimaWorkRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
