CREATE TABLE IF NOT EXISTS "ProductionFlowConfigOverride" (
  "key" TEXT NOT NULL,
  "config" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductionFlowConfigOverride_pkey" PRIMARY KEY ("key")
);
