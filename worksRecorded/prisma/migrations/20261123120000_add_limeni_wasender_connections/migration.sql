CREATE TABLE "WasenderWhatsAppConnection" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "providerSessionId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WasenderWhatsAppConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WasenderWhatsAppConnection_org_phone_key"
  ON "WasenderWhatsAppConnection"("organizationId", "phone");
CREATE UNIQUE INDEX "WasenderWhatsAppConnection_providerSessionId_key"
  ON "WasenderWhatsAppConnection"("providerSessionId");
CREATE INDEX "WasenderWhatsAppConnection_org_user_idx"
  ON "WasenderWhatsAppConnection"("organizationId", "userId");

ALTER TABLE "WasenderWhatsAppConnection" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "WasenderWhatsAppConnection" FROM anon, authenticated, service_role;
