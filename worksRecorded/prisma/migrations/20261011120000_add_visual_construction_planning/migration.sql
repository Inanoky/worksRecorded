ALTER TABLE "ConstructionPlan"
ADD COLUMN "planType" TEXT NOT NULL DEFAULT 'daily',
ADD COLUMN "startDate" DATE,
ADD COLUMN "visualDrawingId" TEXT,
ADD COLUMN "visualAreas" JSONB,
ADD COLUMN "geometryReviewRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedBy" TEXT,
ADD CONSTRAINT "ConstructionPlan_planType_check" CHECK ("planType" IN ('daily', 'visual_milestone')),
ADD CONSTRAINT "ConstructionPlan_visual_milestone_fields_check" CHECK (
  "planType" <> 'visual_milestone'
  OR (
    "startDate" IS NOT NULL
    AND "visualAreas" IS NOT NULL
    AND "startDate" <= "date"
  )
);

DROP INDEX "ConstructionPlan_siteId_date_matchKey_key";

CREATE UNIQUE INDEX "ConstructionPlan_siteId_date_matchKey_planType_key"
ON "ConstructionPlan"("siteId", "date", "matchKey", "planType");

CREATE INDEX "ConstructionPlan_siteId_planType_archivedAt_startDate_date_idx"
ON "ConstructionPlan"("siteId", "planType", "archivedAt", "startDate", "date");

CREATE TABLE "ConstructionPlanRevision" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConstructionPlanRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConstructionPlanRevision_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ConstructionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ConstructionPlanRevision_planId_createdAt_idx"
ON "ConstructionPlanRevision"("planId", "createdAt");

ALTER TABLE "ConstructionPlanRevision" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ConstructionPlanRevision" FROM anon, authenticated;
