ALTER TABLE "TgemInvoiceCase"
ADD COLUMN "invoiceType" TEXT NOT NULL DEFAULT 'debit',
ADD COLUMN "costCode" TEXT;

ALTER TABLE "TgemInvoiceCase"
ADD CONSTRAINT "TgemInvoiceCase_invoiceType_check"
CHECK ("invoiceType" IN ('credit', 'debit'));

CREATE INDEX "TgemInvoiceCase_organizationId_costCode_idx"
ON "TgemInvoiceCase"("organizationId", "costCode");

CREATE TABLE "TgemCostCode" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TgemCostCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TgemCostCode_organizationId_code_key"
ON "TgemCostCode"("organizationId", "code");

CREATE INDEX "TgemCostCode_organizationId_isActive_code_idx"
ON "TgemCostCode"("organizationId", "isActive", "code");

ALTER TABLE "TgemCostCode"
ADD CONSTRAINT "TgemCostCode_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
