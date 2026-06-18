-- CreateTable
CREATE TABLE "ZTCrecords" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "workerId" TEXT,
    "siteId" TEXT,
    "Date" TIMESTAMP(3),
    "Date_Custom_1" TIMESTAMP(3),
    "Date_Custom_2" TIMESTAMP(3),
    "Location" TEXT,
    "Location_Custom_1" TEXT,
    "Location_Custom_2" TEXT,
    "Works" TEXT,
    "Works_Custom_1" TEXT,
    "Works_Custom_2" TEXT,
    "Comments" TEXT,
    "Comments_Custom_1" TEXT,
    "Comments_Custom_2" TEXT,
    "originalUserComment" TEXT,
    "originalAudioUrl" TEXT,
    "Units" TEXT,
    "Amounts" DOUBLE PRECISION,
    "BISId" TEXT,
    "bisStatus" TEXT,
    "WorkersInvolved" DOUBLE PRECISION,
    "TimeInvolved" DOUBLE PRECISION,
    "Photos" TEXT[],
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZTCrecords_pkey" PRIMARY KEY ("id")
);

-- Preserve the existing ZTC history while moving the flow to its dedicated table.
INSERT INTO "ZTCrecords" (
    "id",
    "userId",
    "workerId",
    "siteId",
    "Date",
    "Date_Custom_1",
    "Date_Custom_2",
    "Location",
    "Location_Custom_1",
    "Location_Custom_2",
    "Works",
    "Works_Custom_1",
    "Works_Custom_2",
    "Comments",
    "Comments_Custom_1",
    "Comments_Custom_2",
    "originalUserComment",
    "originalAudioUrl",
    "Units",
    "Amounts",
    "BISId",
    "bisStatus",
    "WorkersInvolved",
    "TimeInvolved",
    "Photos",
    "organizationId",
    "createdAt"
)
SELECT
    "id",
    "userId",
    "workerId",
    "siteId",
    "Date",
    "Date_Custom_1",
    "Date_Custom_2",
    "Location",
    "Location_Custom_1",
    "Location_Custom_2",
    "Works",
    "Works_Custom_1",
    "Works_Custom_2",
    "Comments",
    "Comments_Custom_1",
    "Comments_Custom_2",
    "originalUserComment",
    "originalAudioUrl",
    "Units",
    "Amounts",
    "BISId",
    "bisStatus",
    "WorkersInvolved",
    "TimeInvolved",
    "Photos",
    "organizationId",
    "createdAt"
FROM "sitediaryrecords"
WHERE "siteId" = '4c26c435-dd19-49d7-ad60-981eb1eeaeff'
ON CONFLICT ("id") DO NOTHING;

-- AddForeignKey
ALTER TABLE "ZTCrecords"
ADD CONSTRAINT "ZTCrecords_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZTCrecords"
ADD CONSTRAINT "ZTCrecords_workerId_fkey"
FOREIGN KEY ("workerId") REFERENCES "workers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZTCrecords"
ADD CONSTRAINT "ZTCrecords_siteId_fkey"
FOREIGN KEY ("siteId") REFERENCES "Site"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZTCrecords"
ADD CONSTRAINT "ZTCrecords_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
