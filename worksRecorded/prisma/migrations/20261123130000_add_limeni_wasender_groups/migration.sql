ALTER TABLE "WhatsAppTaskSend" ADD COLUMN "wasenderConnectionId" TEXT;
ALTER TABLE "WhatsAppTaskSendItem" ADD COLUMN "wasenderMessageId" TEXT;

CREATE TABLE "WasenderProjectGroups" (
  "siteId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "groups" JSONB NOT NULL,
  CONSTRAINT "WasenderProjectGroups_pkey" PRIMARY KEY ("siteId", "userId"),
  CONSTRAINT "WasenderProjectGroups_connectionId_fkey" FOREIGN KEY ("connectionId")
    REFERENCES "WasenderWhatsAppConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "WasenderProjectGroups_connectionId_idx" ON "WasenderProjectGroups"("connectionId");

CREATE TABLE "WasenderTaskImage" (
  "itemId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "image" BYTEA NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WasenderTaskImage_pkey" PRIMARY KEY ("itemId"),
  CONSTRAINT "WasenderTaskImage_itemId_fkey" FOREIGN KEY ("itemId")
    REFERENCES "WhatsAppTaskSendItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WasenderTaskImage_tokenHash_key" ON "WasenderTaskImage"("tokenHash");
CREATE INDEX "WasenderTaskImage_expiresAt_idx" ON "WasenderTaskImage"("expiresAt");

ALTER TABLE "WasenderProjectGroups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WasenderTaskImage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "WasenderProjectGroups", "WasenderTaskImage" FROM anon, authenticated, service_role;
