-- Add a Meta WhatsApp identity layer so phone numbers can remain optional in webhook payloads.
CREATE TABLE IF NOT EXISTS "public"."WhatsAppIdentity" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'meta',
    "phone" TEXT,
    "waId" TEXT,
    "bsuid" TEXT,
    "parentBsuid" TEXT,
    "username" TEXT,
    "businessPhoneNumberId" TEXT,
    "wabaId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "userId" TEXT,
    "workerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppIdentity_businessPhoneNumberId_bsuid_key" ON "public"."WhatsAppIdentity"("businessPhoneNumberId", "bsuid");
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppIdentity_businessPhoneNumberId_parentBsuid_key" ON "public"."WhatsAppIdentity"("businessPhoneNumberId", "parentBsuid");
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppIdentity_businessPhoneNumberId_phone_key" ON "public"."WhatsAppIdentity"("businessPhoneNumberId", "phone");
CREATE INDEX IF NOT EXISTS "WhatsAppIdentity_phone_idx" ON "public"."WhatsAppIdentity"("phone");
CREATE INDEX IF NOT EXISTS "WhatsAppIdentity_waId_idx" ON "public"."WhatsAppIdentity"("waId");
CREATE INDEX IF NOT EXISTS "WhatsAppIdentity_bsuid_idx" ON "public"."WhatsAppIdentity"("bsuid");
CREATE INDEX IF NOT EXISTS "WhatsAppIdentity_parentBsuid_idx" ON "public"."WhatsAppIdentity"("parentBsuid");
CREATE INDEX IF NOT EXISTS "WhatsAppIdentity_userId_idx" ON "public"."WhatsAppIdentity"("userId");
CREATE INDEX IF NOT EXISTS "WhatsAppIdentity_workerId_idx" ON "public"."WhatsAppIdentity"("workerId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WhatsAppIdentity_userId_fkey'
  ) THEN
    ALTER TABLE "public"."WhatsAppIdentity" ADD CONSTRAINT "WhatsAppIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WhatsAppIdentity_workerId_fkey'
  ) THEN
    ALTER TABLE "public"."WhatsAppIdentity" ADD CONSTRAINT "WhatsAppIdentity_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "public"."workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
