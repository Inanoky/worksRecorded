ALTER TABLE "MetaInboundMessage"
ADD COLUMN "organizationId" TEXT,
ADD COLUMN "filteredText" TEXT,
ADD COLUMN "routeOutcome" TEXT;

ALTER TABLE "MetaInboundMessage"
ADD CONSTRAINT "MetaInboundMessage_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "WhatsAppBusinessNumber" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "businessPhoneNumberId" TEXT NOT NULL,
  "displayPhoneNumber" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "inboundMode" TEXT NOT NULL,
  "credentialProfile" TEXT NOT NULL,
  "templateName" TEXT NOT NULL,
  "templateLanguage" TEXT NOT NULL DEFAULT 'lv',
  "active" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppBusinessNumber_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhatsAppBusinessNumber_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WhatsAppBusinessNumber_businessPhoneNumberId_key"
ON "WhatsAppBusinessNumber"("businessPhoneNumberId");
CREATE INDEX "WhatsAppBusinessNumber_org_active_idx"
ON "WhatsAppBusinessNumber"("organizationId", "active");

CREATE TABLE "WhatsAppTaskSend" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "planVersion" INTEGER NOT NULL,
  "senderUserId" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'processing',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppTaskSend_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppTaskSend_idempotencyKey_key"
ON "WhatsAppTaskSend"("idempotencyKey");
CREATE INDEX "WhatsAppTaskSend_org_created_idx"
ON "WhatsAppTaskSend"("organizationId", "createdAt");
CREATE INDEX "WhatsAppTaskSend_plan_created_idx"
ON "WhatsAppTaskSend"("siteId", "planId", "createdAt");

CREATE TABLE "WhatsAppTaskSendItem" (
  "id" TEXT NOT NULL,
  "sendId" TEXT NOT NULL,
  "ordinal" INTEGER NOT NULL,
  "page" INTEGER NOT NULL,
  "section" TEXT,
  "imageSha256" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "metaMediaId" TEXT,
  "metaMessageId" TEXT,
  "providerError" TEXT,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppTaskSendItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhatsAppTaskSendItem_sendId_fkey"
    FOREIGN KEY ("sendId") REFERENCES "WhatsAppTaskSend"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WhatsAppTaskSendItem_metaMessageId_key"
ON "WhatsAppTaskSendItem"("metaMessageId");
CREATE UNIQUE INDEX "WhatsAppTaskSendItem_sendId_ordinal_key"
ON "WhatsAppTaskSendItem"("sendId", "ordinal");
CREATE INDEX "WhatsAppTaskSendItem_send_status_idx"
ON "WhatsAppTaskSendItem"("sendId", "status");
