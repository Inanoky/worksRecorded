-- CreateTable
CREATE TABLE IF NOT EXISTS "SiteWeatherHourly" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "organizationId" TEXT,
    "weatherDate" DATE NOT NULL,
    "hour" INTEGER NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "temperatureC" DOUBLE PRECISION,
    "windSpeedMs" DOUBLE PRECISION,
    "precipitationMm" DOUBLE PRECISION,
    "provider" TEXT NOT NULL DEFAULT 'open-meteo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteWeatherHourly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SiteWeatherHourly_siteId_weatherDate_hour_key"
ON "SiteWeatherHourly"("siteId", "weatherDate", "hour");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SiteWeatherHourly_siteId_weatherDate_idx"
ON "SiteWeatherHourly"("siteId", "weatherDate");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SiteWeatherHourly_siteId_fkey'
  ) THEN
    ALTER TABLE "SiteWeatherHourly"
    ADD CONSTRAINT "SiteWeatherHourly_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SiteWeatherHourly_organizationId_fkey'
  ) THEN
    ALTER TABLE "SiteWeatherHourly"
    ADD CONSTRAINT "SiteWeatherHourly_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
