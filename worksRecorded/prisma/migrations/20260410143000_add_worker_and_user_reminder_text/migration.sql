-- Add reminder text for users (site managers/project managers)
ALTER TABLE "User"
ADD COLUMN "reminderText" TEXT;

-- Add reminder controls for workers
ALTER TABLE "workers"
ADD COLUMN "reminderTime" TIMESTAMP(3),
ADD COLUMN "timezone" TEXT,
ADD COLUMN "remindersEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reminderText" TEXT;
