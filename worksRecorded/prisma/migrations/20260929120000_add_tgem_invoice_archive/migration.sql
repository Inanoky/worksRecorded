ALTER TABLE "TgemInvoiceCase"
ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "TgemInvoiceCase_organizationId_archivedAt_createdAt_idx"
ON "TgemInvoiceCase"("organizationId", "archivedAt", "createdAt");

CREATE INDEX "TgemInvoiceCase_siteId_archivedAt_createdAt_idx"
ON "TgemInvoiceCase"("siteId", "archivedAt", "createdAt");
