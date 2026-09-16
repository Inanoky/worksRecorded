CREATE TABLE "SbStommeProgressReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SbStommeProgressReport_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SbStommeProgressReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SbStommeProgressReport_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SbStommeProgressReport_siteId_weekStart_key" ON "SbStommeProgressReport"("siteId", "weekStart");
CREATE INDEX "SbStommeProgressReport_organizationId_weekStart_idx" ON "SbStommeProgressReport"("organizationId", "weekStart");
