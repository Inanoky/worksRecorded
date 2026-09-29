CREATE TABLE "TgemInvoiceApprovalFlow" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TgemInvoiceApprovalFlow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TgemInvoiceApprovalFlowStep" (
  "id" TEXT NOT NULL,
  "flowId" TEXT NOT NULL,
  "stepOrder" INTEGER NOT NULL,
  "roleKey" TEXT NOT NULL DEFAULT 'project_review',
  "role" TEXT,
  "approverUserId" TEXT NOT NULL,
  "minimumInvoiceTotal" DECIMAL(14,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TgemInvoiceApprovalFlowStep_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TgemInvoiceApprovalFlow_organizationId_name_key"
ON "TgemInvoiceApprovalFlow"("organizationId", "name");

CREATE INDEX "TgemInvoiceApprovalFlow_organizationId_name_idx"
ON "TgemInvoiceApprovalFlow"("organizationId", "name");

CREATE UNIQUE INDEX "TgemInvoiceApprovalFlowStep_flowId_stepOrder_key"
ON "TgemInvoiceApprovalFlowStep"("flowId", "stepOrder");

CREATE UNIQUE INDEX "TgemInvoiceApprovalFlowStep_flowId_approverUserId_key"
ON "TgemInvoiceApprovalFlowStep"("flowId", "approverUserId");

CREATE INDEX "TgemInvoiceApprovalFlowStep_approverUserId_idx"
ON "TgemInvoiceApprovalFlowStep"("approverUserId");

ALTER TABLE "TgemInvoiceApprovalFlow"
ADD CONSTRAINT "TgemInvoiceApprovalFlow_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceApprovalFlowStep"
ADD CONSTRAINT "TgemInvoiceApprovalFlowStep_flowId_fkey"
FOREIGN KEY ("flowId") REFERENCES "TgemInvoiceApprovalFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceApprovalFlowStep"
ADD CONSTRAINT "TgemInvoiceApprovalFlowStep_approverUserId_fkey"
FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceSubmitterApprovalFlow"
ADD COLUMN "flowId" TEXT;

WITH "assignedSites" AS (
  SELECT DISTINCT "organizationId", "templateSiteId"
  FROM "TgemInvoiceSubmitterApprovalFlow"
)
INSERT INTO "TgemInvoiceApprovalFlow" (
  "id",
  "organizationId",
  "name",
  "currency",
  "createdByUserId",
  "createdAt",
  "updatedAt"
)
SELECT
  'legacy-' || md5(a."organizationId" || ':' || a."templateSiteId"),
  a."organizationId",
  s."name" || ' (imported project flow ' || a."templateSiteId" || ')',
  COALESCE(t."currency", 'EUR'),
  COALESCE(
    t."createdByUserId",
    (
      SELECT MIN(existing."userId")
      FROM "TgemInvoiceSubmitterApprovalFlow" existing
      WHERE existing."organizationId" = a."organizationId"
        AND existing."templateSiteId" = a."templateSiteId"
    )
  ),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "assignedSites" a
JOIN "Site" s ON s."id" = a."templateSiteId"
LEFT JOIN LATERAL (
  SELECT template."currency", template."createdByUserId"
  FROM "TgemInvoiceApprovalTemplate" template
  WHERE template."organizationId" = a."organizationId"
    AND template."siteId" = a."templateSiteId"
    AND template."isCurrent" = true
  ORDER BY template."revision" DESC
  LIMIT 1
) t ON true;

WITH "assignedSites" AS (
  SELECT DISTINCT "organizationId", "templateSiteId"
  FROM "TgemInvoiceSubmitterApprovalFlow"
)
INSERT INTO "TgemInvoiceApprovalFlowStep" (
  "id",
  "flowId",
  "stepOrder",
  "roleKey",
  "role",
  "approverUserId",
  "minimumInvoiceTotal",
  "createdAt"
)
SELECT
  'legacy-' || md5(templateStep."id"),
  'legacy-' || md5(a."organizationId" || ':' || a."templateSiteId"),
  templateStep."stepOrder",
  templateStep."roleKey",
  templateStep."role",
  templateStep."approverUserId",
  templateStep."minimumInvoiceTotal",
  templateStep."createdAt"
FROM "assignedSites" a
JOIN LATERAL (
  SELECT template."id"
  FROM "TgemInvoiceApprovalTemplate" template
  WHERE template."organizationId" = a."organizationId"
    AND template."siteId" = a."templateSiteId"
    AND template."isCurrent" = true
  ORDER BY template."revision" DESC
  LIMIT 1
) currentTemplate ON true
JOIN "TgemInvoiceApprovalTemplateStep" templateStep
  ON templateStep."templateId" = currentTemplate."id";

UPDATE "TgemInvoiceSubmitterApprovalFlow"
SET "flowId" = 'legacy-' || md5("organizationId" || ':' || "templateSiteId");

ALTER TABLE "TgemInvoiceSubmitterApprovalFlow"
ALTER COLUMN "flowId" SET NOT NULL;

ALTER TABLE "TgemInvoiceSubmitterApprovalFlow"
DROP CONSTRAINT "TgemInvoiceSubmitterApprovalFlow_templateSiteId_fkey";

DROP INDEX "TgemInvoiceSubmitterApprovalFlow_organizationId_templateSiteId_idx";

ALTER TABLE "TgemInvoiceSubmitterApprovalFlow"
DROP COLUMN "templateSiteId";

CREATE INDEX "TgemInvoiceSubmitterApprovalFlow_organizationId_flowId_idx"
ON "TgemInvoiceSubmitterApprovalFlow"("organizationId", "flowId");

ALTER TABLE "TgemInvoiceSubmitterApprovalFlow"
ADD CONSTRAINT "TgemInvoiceSubmitterApprovalFlow_flowId_fkey"
FOREIGN KEY ("flowId") REFERENCES "TgemInvoiceApprovalFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
