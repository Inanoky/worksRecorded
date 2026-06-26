-- CreateTable
CREATE TABLE "ZtcInboundMediaBatch" (
    "id" TEXT NOT NULL,
    "batchKey" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "organizationId" TEXT,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'collecting',
    "items" JSONB NOT NULL,
    "firstReceivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReceivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageId" TEXT,
    "processAfter" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZtcInboundMediaBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZtcInboundMediaBatch_batchKey_key" ON "ZtcInboundMediaBatch"("batchKey");

-- CreateIndex
CREATE INDEX "ZtcInboundMediaBatch_worker_status_process_idx" ON "ZtcInboundMediaBatch"("workerId", "status", "processAfter");
