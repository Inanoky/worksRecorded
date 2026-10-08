ALTER TABLE "TgemInvoiceCase"
ADD COLUMN "splitParentInvoiceCaseId" TEXT,
ADD COLUMN "splitRootInvoiceCaseId" TEXT,
ADD COLUMN "splitGeneration" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "splitKind" TEXT,
ADD COLUMN "splitSubtotalAdjustment" DECIMAL(65,30);

ALTER TABLE "TgemInvoiceCase"
ADD CONSTRAINT "TgemInvoiceCase_splitGeneration_check"
CHECK ("splitGeneration" >= 0),
ADD CONSTRAINT "TgemInvoiceCase_splitKind_check"
CHECK ("splitKind" IS NULL OR "splitKind" IN ('allocated', 'residual'));

CREATE INDEX "TgemInvoiceCase_splitParentInvoiceCaseId_idx"
ON "TgemInvoiceCase"("splitParentInvoiceCaseId");

CREATE INDEX "TgemInvoiceCase_splitRootInvoiceCaseId_archivedAt_createdAt_idx"
ON "TgemInvoiceCase"("splitRootInvoiceCaseId", "archivedAt", "createdAt");

ALTER TABLE "TgemInvoiceCase"
ADD CONSTRAINT "TgemInvoiceCase_splitParentInvoiceCaseId_fkey"
FOREIGN KEY ("splitParentInvoiceCaseId") REFERENCES "TgemInvoiceCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
