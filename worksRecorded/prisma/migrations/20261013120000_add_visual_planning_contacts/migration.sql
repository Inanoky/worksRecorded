CREATE TABLE "VisualPlanningContact" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VisualPlanningContact_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VisualPlanningContact_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "VisualPlanningContact_siteId_phone_key"
ON "VisualPlanningContact"("siteId", "phone");

CREATE INDEX "VisualPlanningContact_siteId_archivedAt_name_idx"
ON "VisualPlanningContact"("siteId", "archivedAt", "name");

ALTER TABLE "ConstructionPlan"
ADD COLUMN "visualPlanningContactId" TEXT,
ADD CONSTRAINT "ConstructionPlan_visualPlanningContactId_fkey" FOREIGN KEY ("visualPlanningContactId") REFERENCES "VisualPlanningContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ConstructionPlan_visualPlanningContactId_idx"
ON "ConstructionPlan"("visualPlanningContactId");

ALTER TABLE "VisualPlanningContact" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "VisualPlanningContact" FROM anon, authenticated;
