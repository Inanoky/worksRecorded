ALTER TABLE "TgemInvoiceCase"
ADD COLUMN "sourceContext" JSONB,
ADD COLUMN "projectMatchConfidence" DOUBLE PRECISION,
ADD COLUMN "projectMatchMethod" TEXT,
ADD COLUMN "projectMatchSummary" JSONB;

CREATE TABLE "TgemInboundMailbox" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TgemInboundMailbox_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TgemInboundMailbox_address_lowercase_check" CHECK ("address" = LOWER(BTRIM("address")))
);

CREATE UNIQUE INDEX "TgemInboundMailbox_address_key" ON "TgemInboundMailbox"("address");
CREATE INDEX "TgemInboundMailbox_organizationId_enabled_idx" ON "TgemInboundMailbox"("organizationId", "enabled");

ALTER TABLE "TgemInboundMailbox"
ADD CONSTRAINT "TgemInboundMailbox_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
