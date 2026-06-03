-- Add reminder text for users (site managers/project managers)
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "reminderText" TEXT;

-- Add reminder controls for workers
ALTER TABLE "workers"
ADD COLUMN IF NOT EXISTS "reminderTime" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "timezone" TEXT,
ADD COLUMN IF NOT EXISTS "remindersEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "reminderText" TEXT;
