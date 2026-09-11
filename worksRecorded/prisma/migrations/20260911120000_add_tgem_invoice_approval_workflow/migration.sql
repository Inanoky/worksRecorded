ALTER TABLE "TgemInvoiceCase"
ADD COLUMN "approvalRound" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "TgemInvoiceApprovalStep"
ADD COLUMN "approvalRound" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "approverName" TEXT,
ADD COLUMN "templateRevision" INTEGER;

DROP INDEX "TgemInvoiceApprovalStep_invoiceCaseId_stepOrder_key";

CREATE UNIQUE INDEX "TgemInvoiceApprovalStep_invoiceCaseId_approvalRound_stepOrder_key"
ON "TgemInvoiceApprovalStep"("invoiceCaseId", "approvalRound", "stepOrder");

CREATE TABLE "TgemInvoiceApprovalTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TgemInvoiceApprovalTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TgemInvoiceApprovalTemplateStep" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "approverUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TgemInvoiceApprovalTemplateStep_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TgemInvoiceApprovalTemplate_siteId_revision_key"
ON "TgemInvoiceApprovalTemplate"("siteId", "revision");

CREATE INDEX "TgemInvoiceApprovalTemplate_organizationId_siteId_isCurrent_idx"
ON "TgemInvoiceApprovalTemplate"("organizationId", "siteId", "isCurrent");

CREATE UNIQUE INDEX "TgemInvoiceApprovalTemplateStep_templateId_stepOrder_key"
ON "TgemInvoiceApprovalTemplateStep"("templateId", "stepOrder");

CREATE UNIQUE INDEX "TgemInvoiceApprovalTemplateStep_templateId_approverUserId_key"
ON "TgemInvoiceApprovalTemplateStep"("templateId", "approverUserId");

CREATE INDEX "TgemInvoiceApprovalTemplateStep_approverUserId_idx"
ON "TgemInvoiceApprovalTemplateStep"("approverUserId");

ALTER TABLE "TgemInvoiceApprovalTemplate"
ADD CONSTRAINT "TgemInvoiceApprovalTemplate_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceApprovalTemplate"
ADD CONSTRAINT "TgemInvoiceApprovalTemplate_siteId_fkey"
FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceApprovalTemplateStep"
ADD CONSTRAINT "TgemInvoiceApprovalTemplateStep_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "TgemInvoiceApprovalTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceApprovalTemplateStep"
ADD CONSTRAINT "TgemInvoiceApprovalTemplateStep_approverUserId_fkey"
FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
