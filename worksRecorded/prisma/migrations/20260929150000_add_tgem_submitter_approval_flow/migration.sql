ALTER TABLE "TgemInvoiceCase"
ADD COLUMN "approvalRouteSnapshot" JSONB;

CREATE TABLE "TgemInvoiceSubmitterApprovalFlow" (
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "templateSiteId" TEXT NOT NULL,
  CONSTRAINT "TgemInvoiceSubmitterApprovalFlow_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX "TgemInvoiceSubmitterApprovalFlow_organizationId_templateSiteId_idx"
ON "TgemInvoiceSubmitterApprovalFlow"("organizationId", "templateSiteId");

ALTER TABLE "TgemInvoiceSubmitterApprovalFlow"
ADD CONSTRAINT "TgemInvoiceSubmitterApprovalFlow_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceSubmitterApprovalFlow"
ADD CONSTRAINT "TgemInvoiceSubmitterApprovalFlow_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceSubmitterApprovalFlow"
ADD CONSTRAINT "TgemInvoiceSubmitterApprovalFlow_templateSiteId_fkey"
FOREIGN KEY ("templateSiteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
