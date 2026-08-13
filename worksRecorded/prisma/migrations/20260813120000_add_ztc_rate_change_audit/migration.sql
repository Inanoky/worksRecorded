CREATE TABLE "ZtcRateChangeAudit" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "organizationId" TEXT,
  "actorUserId" TEXT NOT NULL,
  "actorEmail" TEXT,
  "beforeRates" JSONB NOT NULL,
  "afterRates" JSONB NOT NULL,
  "changes" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ZtcRateChangeAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ZtcRateChangeAudit_site_created_idx"
  ON "ZtcRateChangeAudit"("siteId", "createdAt");

CREATE INDEX "ZtcRateChangeAudit_org_created_idx"
  ON "ZtcRateChangeAudit"("organizationId", "createdAt");
