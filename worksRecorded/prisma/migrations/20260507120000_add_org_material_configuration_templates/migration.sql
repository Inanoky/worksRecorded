ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "bisMaterialConfigurationTemplates" JSONB;
