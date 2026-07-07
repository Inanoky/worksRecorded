CREATE TABLE "MetaInboundMessage" (
    "messageId" TEXT NOT NULL,
    "messageType" TEXT,
    "sender" TEXT,
    "businessPhoneNumberId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaInboundMessage_pkey" PRIMARY KEY ("messageId")
);

CREATE INDEX "MetaInboundMessage_status_received_idx"
ON "MetaInboundMessage"("status", "receivedAt");
