ALTER TABLE "WhatsAppTaskSend"
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'meta',
  ADD COLUMN "recipientLabel" TEXT,
  ADD COLUMN "senderAddress" TEXT;

ALTER TABLE "WhatsAppTaskSendItem" ADD COLUMN "whapiMessageId" TEXT;
CREATE UNIQUE INDEX "WhatsAppTaskSendItem_whapiMessageId_key"
ON "WhatsAppTaskSendItem"("whapiMessageId");

CREATE TABLE "WhapiUserConnection" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channelId" TEXT,
  "encryptedToken" TEXT,
  "phone" TEXT,
  "privacyConfigured" BOOLEAN NOT NULL DEFAULT false,
  "pairingExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhapiUserConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhapiUserConnection_organizationId_userId_key"
ON "WhapiUserConnection"("organizationId", "userId");
CREATE UNIQUE INDEX "WhapiUserConnection_channelId_key"
ON "WhapiUserConnection"("channelId");

CREATE TABLE "WhapiProjectGroups" (
  "siteId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "groups" JSONB NOT NULL,
  CONSTRAINT "WhapiProjectGroups_pkey" PRIMARY KEY ("siteId", "connectionId"),
  CONSTRAINT "WhapiProjectGroups_connectionId_fkey" FOREIGN KEY ("connectionId")
    REFERENCES "WhapiUserConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "WhapiProjectGroups_connectionId_idx" ON "WhapiProjectGroups"("connectionId");

ALTER TABLE "WhapiUserConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WhapiProjectGroups" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "WhapiUserConnection", "WhapiProjectGroups" FROM anon, authenticated;
