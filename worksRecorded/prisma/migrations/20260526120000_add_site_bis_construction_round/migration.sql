ALTER TABLE "Site"
ADD COLUMN IF NOT EXISTS "bisConstructionRoundId" TEXT,
ADD COLUMN IF NOT EXISTS "bisConstructionRoundName" TEXT,
ADD COLUMN IF NOT EXISTS "bisConstructionRoundNumber" INTEGER,
ADD COLUMN IF NOT EXISTS "bisConstructionRoundStatus" TEXT;
