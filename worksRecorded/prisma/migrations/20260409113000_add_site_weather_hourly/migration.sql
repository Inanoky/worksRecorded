-- CreateTable
CREATE TABLE "SiteWeatherHourly" (
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
CREATE UNIQUE INDEX "SiteWeatherHourly_siteId_weatherDate_hour_key"
ON "SiteWeatherHourly"("siteId", "weatherDate", "hour");

-- CreateIndex
CREATE INDEX "SiteWeatherHourly_siteId_weatherDate_idx"
ON "SiteWeatherHourly"("siteId", "weatherDate");

-- AddForeignKey
ALTER TABLE "SiteWeatherHourly"
ADD CONSTRAINT "SiteWeatherHourly_siteId_fkey"
FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteWeatherHourly"
ADD CONSTRAINT "SiteWeatherHourly_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
