-- AlterTable
ALTER TABLE "SiteWeatherHourly"
ADD COLUMN "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "sourceUpdatedAt" TIMESTAMP(3),
ADD COLUMN "isForecast" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "SiteWeatherHourly_weatherDate_isForecast_idx"
ON "SiteWeatherHourly"("weatherDate", "isForecast");
