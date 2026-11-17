CREATE TABLE "ConstructionDiaryReviewQueue" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "recordIds" JSONB NOT NULL DEFAULT '[]',
  "revision" INTEGER NOT NULL DEFAULT 0,
  "firstReceivedAt" TIMESTAMP(3),
  "lastReceivedAt" TIMESTAMP(3),
  "processAfter" TIMESTAMP(3),
  "leaseToken" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "activeRunId" TEXT,
  "failures" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConstructionDiaryReviewQueue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionDiaryReviewRun" (
  "id" TEXT NOT NULL,
  "queueId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running',
  "recordIds" JSONB NOT NULL,
  "snapshot" JSONB,
  "proposal" JSONB,
  "sessionItems" JSONB NOT NULL DEFAULT '[]',
  "metrics" JSONB,
  "errorCode" TEXT,
  "leaseToken" TEXT NOT NULL,
  "decidedBy" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "ConstructionDiaryReviewRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConstructionDiaryReviewQueue_siteId_userId_key" ON "ConstructionDiaryReviewQueue"("siteId", "userId");
CREATE INDEX "ConstructionDiaryReviewQueue_processAfter_leaseUntil_idx" ON "ConstructionDiaryReviewQueue"("processAfter", "leaseUntil");
CREATE INDEX "ConstructionDiaryReviewRun_siteId_createdAt_idx" ON "ConstructionDiaryReviewRun"("siteId", "createdAt");
CREATE INDEX "ConstructionDiaryReviewRun_queueId_status_idx" ON "ConstructionDiaryReviewRun"("queueId", "status");
