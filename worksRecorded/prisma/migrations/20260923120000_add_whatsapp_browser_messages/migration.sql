CREATE TABLE "WhatsappBrowserMessage" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "senderName" TEXT,
    "senderPhone" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "rawText" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "recordIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "projectIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "ambiguity" TEXT,
    "lastError" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappBrowserMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsappBrowserMessage_idempotencyKey_key"
ON "WhatsappBrowserMessage"("idempotencyKey");

CREATE INDEX "WhatsappBrowserMessage_org_sent_idx"
ON "WhatsappBrowserMessage"("organizationId", "sentAt");

CREATE INDEX "WhatsappBrowserMessage_status_created_idx"
ON "WhatsappBrowserMessage"("status", "createdAt");
