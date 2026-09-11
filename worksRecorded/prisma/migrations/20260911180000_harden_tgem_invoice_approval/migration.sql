ALTER TABLE "TgemInvoiceApprovalTemplate"
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR';

ALTER TABLE "TgemInvoiceApprovalTemplateStep"
ADD COLUMN "roleKey" TEXT NOT NULL DEFAULT 'project_review',
ADD COLUMN "minimumInvoiceTotal" DECIMAL(14, 2),
ALTER COLUMN "role" DROP NOT NULL;

ALTER TABLE "TgemInvoiceApprovalStep"
ADD COLUMN "roleKey" TEXT NOT NULL DEFAULT 'project_review',
ADD COLUMN "minimumInvoiceTotal" DECIMAL(14, 2),
ADD COLUMN "thresholdCurrency" TEXT,
ALTER COLUMN "role" DROP NOT NULL;

ALTER INDEX IF EXISTS "TgemInvoiceApprovalStep_invoiceCaseId_approvalRound_stepOrder_k"
RENAME TO "TgemInvoiceApprovalStep_invoiceCaseId_approvalRound_stepOrd_key";

UPDATE "TgemInvoiceApprovalTemplateStep"
SET "roleKey" = CASE
  WHEN LOWER(COALESCE("role", '')) LIKE ANY (ARRAY['%account%', '%finance%', '%finan%', '%grāmat%', '%cost controller%']) THEN 'financial_review'
  WHEN LOWER(COALESCE("role", '')) LIKE ANY (ARRAY['%board%', '%owner%', '%director%', '%valdes%', '%īpašnie%']) THEN 'senior_approval'
  WHEN LOWER(COALESCE("role", '')) LIKE ANY (ARRAY['%commercial%', '%operations%', '%komerc%', '%operāciju%']) THEN 'budget_approval'
  ELSE 'project_review'
END;

UPDATE "TgemInvoiceApprovalStep"
SET "roleKey" = CASE
  WHEN LOWER(COALESCE("role", '')) LIKE ANY (ARRAY['%account%', '%finance%', '%finan%', '%grāmat%', '%cost controller%']) THEN 'financial_review'
  WHEN LOWER(COALESCE("role", '')) LIKE ANY (ARRAY['%board%', '%owner%', '%director%', '%valdes%', '%īpašnie%']) THEN 'senior_approval'
  WHEN LOWER(COALESCE("role", '')) LIKE ANY (ARRAY['%commercial%', '%operations%', '%komerc%', '%operāciju%']) THEN 'budget_approval'
  ELSE 'project_review'
END;

ALTER TABLE "TgemInvoiceApprovalTemplateStep"
ADD CONSTRAINT "TgemInvoiceApprovalTemplateStep_roleKey_check"
CHECK ("roleKey" IN ('project_review', 'financial_review', 'budget_approval', 'senior_approval')),
ADD CONSTRAINT "TgemInvoiceApprovalTemplateStep_minimumInvoiceTotal_check"
CHECK ("minimumInvoiceTotal" IS NULL OR "minimumInvoiceTotal" > 0);

ALTER TABLE "TgemInvoiceApprovalStep"
ADD CONSTRAINT "TgemInvoiceApprovalStep_roleKey_check"
CHECK ("roleKey" IN ('project_review', 'financial_review', 'budget_approval', 'senior_approval')),
ADD CONSTRAINT "TgemInvoiceApprovalStep_minimumInvoiceTotal_check"
CHECK ("minimumInvoiceTotal" IS NULL OR "minimumInvoiceTotal" > 0);

CREATE TABLE "TgemInvoiceWorkflowManager" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TgemInvoiceWorkflowManager_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TgemInvoiceWorkflowManager_siteId_userId_key"
ON "TgemInvoiceWorkflowManager"("siteId", "userId");

CREATE INDEX "TgemInvoiceWorkflowManager_organizationId_siteId_idx"
ON "TgemInvoiceWorkflowManager"("organizationId", "siteId");

CREATE INDEX "TgemInvoiceWorkflowManager_userId_idx"
ON "TgemInvoiceWorkflowManager"("userId");

ALTER TABLE "TgemInvoiceWorkflowManager"
ADD CONSTRAINT "TgemInvoiceWorkflowManager_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceWorkflowManager"
ADD CONSTRAINT "TgemInvoiceWorkflowManager_siteId_fkey"
FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceWorkflowManager"
ADD CONSTRAINT "TgemInvoiceWorkflowManager_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
