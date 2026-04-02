-- Add geofence fields to Site
ALTER TABLE "Site"
ADD COLUMN "geofencePolygon" JSONB,
ADD COLUMN "geofenceMapLink" TEXT;

-- Track pending location based clock-ins on workers
ALTER TABLE "workers"
ADD COLUMN "pendingLocationClockIn" BOOLEAN DEFAULT false,
ADD COLUMN "pendingLocationClockInAt" TIMESTAMP(3);
