CREATE TABLE "ConstructionDiaryFeedback" (
  "siteId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "generatedPrompt" TEXT NOT NULL DEFAULT '',
  "userInstructions" TEXT NOT NULL DEFAULT '',
  "sourceFingerprint" TEXT,
  "sourceRecordCount" INTEGER NOT NULL DEFAULT 0,
  "checkedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "generationToken" TEXT,
  "leaseUntil" TIMESTAMP(3),
  CONSTRAINT "ConstructionDiaryFeedback_pkey" PRIMARY KEY ("siteId"),
  CONSTRAINT "ConstructionDiaryFeedback_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "ConstructionDiaryFeedbackVersion" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "actorId" TEXT,
  "model" TEXT,
  "generatedPrompt" TEXT NOT NULL,
  "userInstructions" TEXT NOT NULL,
  "sourceFingerprint" TEXT,
  "sourceRecordCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConstructionDiaryFeedbackVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConstructionDiaryFeedbackVersion_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "ConstructionDiaryFeedback"("siteId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ConstructionDiaryFeedbackVersion_siteId_revision_key" ON "ConstructionDiaryFeedbackVersion"("siteId", "revision");
ALTER TABLE "ConstructionDiaryFeedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConstructionDiaryFeedbackVersion" ENABLE ROW LEVEL SECURITY;
