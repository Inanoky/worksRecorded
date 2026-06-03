-- CreateTable
CREATE TABLE IF NOT EXISTS "ClockInChallenge" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "sessionHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClockInChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClockInChallenge_workerId_siteId_idx" ON "ClockInChallenge"("workerId", "siteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClockInChallenge_expiresAt_idx" ON "ClockInChallenge"("expiresAt");
