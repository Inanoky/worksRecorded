-- CreateTable
CREATE TABLE "DefaultConstructionInboundMediaBatch" (
    "id" TEXT NOT NULL,
    "batchKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'collecting',
    "items" JSONB NOT NULL,
    "firstReceivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReceivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageId" TEXT,
    "processAfter" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefaultConstructionInboundMediaBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DefaultConstructionInboundMediaBatch_batchKey_key"
ON "DefaultConstructionInboundMediaBatch"("batchKey");

-- CreateIndex
CREATE INDEX "DefaultConstructionInboundMediaBatch_user_status_process_idx"
ON "DefaultConstructionInboundMediaBatch"("userId", "status", "processAfter");
