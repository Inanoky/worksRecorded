-- Add organization-level BIS cost code storage
ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "bisCostCodes" JSONB;
