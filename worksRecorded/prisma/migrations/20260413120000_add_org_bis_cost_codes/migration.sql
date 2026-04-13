-- Add organization-level BIS cost code storage
ALTER TABLE "Organization"
ADD COLUMN "bisCostCodes" JSONB;
