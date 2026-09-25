ALTER TABLE "TgemInvoiceCase"
ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
ADD COLUMN "paidAt" TIMESTAMP(3);

ALTER TABLE "TgemInvoiceCase"
ADD CONSTRAINT "TgemInvoiceCase_paymentStatus_check"
CHECK ("paymentStatus" IN ('unpaid', 'paid'));

CREATE INDEX "TgemInvoiceCase_organizationId_paymentStatus_createdAt_idx"
ON "TgemInvoiceCase"("organizationId", "paymentStatus", "createdAt");
