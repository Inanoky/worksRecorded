CREATE TABLE "ConstructionPlan" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "work" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL CHECK ("quantity" > 0 AND "quantity" <= 1000000000),
  "matchKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConstructionPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConstructionPlan_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ConstructionPlan_siteId_date_matchKey_key" ON "ConstructionPlan"("siteId", "date", "matchKey");
CREATE INDEX "ConstructionPlan_siteId_date_idx" ON "ConstructionPlan"("siteId", "date");
ALTER TABLE "ConstructionPlan" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ConstructionPlan" FROM anon, authenticated;
