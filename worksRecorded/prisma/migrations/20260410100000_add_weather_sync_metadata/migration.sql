-- AlterTable
ALTER TABLE "SiteWeatherHourly"
ADD COLUMN IF NOT EXISTS "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "sourceUpdatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "isForecast" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SiteWeatherHourly_weatherDate_isForecast_idx"
ON "SiteWeatherHourly"("weatherDate", "isForecast");
