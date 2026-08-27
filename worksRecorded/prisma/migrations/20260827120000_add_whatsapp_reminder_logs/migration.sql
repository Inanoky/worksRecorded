ALTER TABLE "User"
ALTER COLUMN "remindersEnabled" SET DEFAULT false;

UPDATE "User"
SET "remindersEnabled" = false
WHERE "remindersEnabled" = true;

CREATE TABLE IF NOT EXISTS "WhatsappReminderLog" (
  "id" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "organizationId" TEXT,
  "siteId" TEXT,
  "localDate" TEXT,
  "timezone" TEXT,
  "scheduledHHmm" TEXT,
  "dedupeKey" TEXT,
  "source" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "reason" TEXT,
  "recipientPhoneMasked" TEXT,
  "metaMessageId" TEXT,
  "metaStatus" INTEGER,
  "metaResponseSummary" TEXT,
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WhatsappReminderLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappReminderLog_dedupe_key_unique"
ON "WhatsappReminderLog"("dedupeKey");

CREATE INDEX IF NOT EXISTS "WhatsappReminderLog_org_created_idx"
ON "WhatsappReminderLog"("organizationId", "createdAt");

CREATE INDEX IF NOT EXISTS "WhatsappReminderLog_target_created_idx"
ON "WhatsappReminderLog"("targetType", "targetId", "createdAt");

CREATE INDEX IF NOT EXISTS "WhatsappReminderLog_status_created_idx"
ON "WhatsappReminderLog"("status", "createdAt");
