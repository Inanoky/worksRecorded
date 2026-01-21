// scripts/copySiteDiary.ts
// Run with: bun scripts/copySiteDiary.ts

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// =====================
// HARDCODED INPUTS
// =====================
const FROM_SITE_ID = "4b8c3b2e-683d-4ff3-83c1-dd9d73609fa6";
const TO_SITE_ID = "b343a908-7765-4541-bbe3-585cb4a8e50b";

// Use "" to mean "not set"
const START_DATE = "2025-10-01"; // e.g. "2025-01-01"
const END_DATE = "2026-01-20"; // e.g. "2025-12-31"

// If true: records/photos with Date = null are ALSO copied
const INCLUDE_NULL_DATES = true;

// Batch size
const PAGE_SIZE = 500;
// =====================

function parseDateOrUndefined(s: string): Date | undefined {
  const v = (s || "").trim();
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function buildDiaryDateWhere(
  start?: Date,
  end?: Date,
  includeNullDates: boolean = true,
): Prisma.sitediaryrecordsWhereInput {
  if (!start && !end) return includeNullDates ? {} : { Date: { not: null } };

  const range: Prisma.DateTimeNullableFilter = {};
  if (start) range.gte = start;
  if (end) range.lte = end;

  return includeNullDates ? { OR: [{ Date: null }, { Date: range }] } : { Date: range };
}

function buildPhotoDateWhere(
  start?: Date,
  end?: Date,
  includeNullDates: boolean = true,
): Prisma.photosWhereInput {
  if (!start && !end) return includeNullDates ? {} : { Date: { not: null } };

  const range: Prisma.DateTimeNullableFilter = {};
  if (start) range.gte = start;
  if (end) range.lte = end;

  return includeNullDates ? { OR: [{ Date: null }, { Date: range }] } : { Date: range };
}

async function main() {
  const start = parseDateOrUndefined(START_DATE);
  const end = parseDateOrUndefined(END_DATE);

  const fromSite = await prisma.site.findUnique({
    where: { id: FROM_SITE_ID },
    select: { id: true, organizationId: true },
  });
  if (!fromSite) throw new Error(`FROM site not found: ${FROM_SITE_ID}`);

  const toSite = await prisma.site.findUnique({
    where: { id: TO_SITE_ID },
    select: { id: true, organizationId: true },
  });
  if (!toSite) throw new Error(`TO site not found: ${TO_SITE_ID}`);

  const diaryDateWhere = buildDiaryDateWhere(start, end, INCLUDE_NULL_DATES);
  const photoDateWhere = buildPhotoDateWhere(start, end, INCLUDE_NULL_DATES);

  // -----------------------
  // COPY sitediaryrecords
  // -----------------------
  let copiedDiary = 0;
  let cursorId: string | undefined;

  for (;;) {
    const rows = await prisma.sitediaryrecords.findMany({
      where: { siteId: FROM_SITE_ID, ...diaryDateWhere },
      orderBy: { id: "asc" },
      take: PAGE_SIZE,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      select: {
        id: true,
        userId: true,
        workerId: true,
        Date: true,
        Location: true,
        Works: true,
        Comments: true,
        Units: true,
        Amounts: true,
        WorkersInvolved: true,
        TimeInvolved: true,
        Photos: true,
      },
    });

    if (rows.length === 0) break;

    const data: Prisma.sitediaryrecordsCreateManyInput[] = rows.map((r) => ({
      userId: r.userId ?? null,
      workerId: r.workerId ?? null,
      siteId: TO_SITE_ID,
      Date: r.Date ?? null,
      Location: r.Location ?? null,
      Works: r.Works ?? null,
      Comments: r.Comments ?? null,
      Units: r.Units ?? null,
      Amounts: r.Amounts ?? null,
      WorkersInvolved: r.WorkersInvolved ?? null,
      TimeInvolved: r.TimeInvolved ?? null,
      Photos: (r.Photos ?? []) as any,
      organizationId: (toSite.organizationId ?? null) as any,
    }));

    const res = await prisma.sitediaryrecords.createMany({ data });

    copiedDiary += res.count;
    cursorId = rows[rows.length - 1]!.id;
  }

  // -----------------------
  // COPY photos
  // -----------------------
  let copiedPhotos = 0;
  cursorId = undefined;

  for (;;) {
    const rows = await prisma.photos.findMany({
      where: { siteId: FROM_SITE_ID, ...photoDateWhere },
      orderBy: { id: "asc" },
      take: PAGE_SIZE,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      select: {
        id: true,
        Date: true,
        URL: true,
        Comment: true,
        Location: true,
        userId: true,
        workerId: true,
        fileUrl: true,
      },
    });

    if (rows.length === 0) break;

    const data: Prisma.photosCreateManyInput[] = rows.map((p) => ({
      Date: p.Date ?? null,
      URL: p.URL ?? null,
      Comment: p.Comment ?? null,
      Location: p.Location ?? null,
      userId: p.userId ?? null,
      workerId: p.workerId ?? null,
      fileUrl: p.fileUrl ?? null,
      siteId: TO_SITE_ID,
      organizationId: (toSite.organizationId ?? null) as any,
    }));

    const res = await prisma.photos.createMany({ data });

    copiedPhotos += res.count;
    cursorId = rows[rows.length - 1]!.id;
  }

  console.log(
    JSON.stringify(
      {
        fromSiteId: FROM_SITE_ID,
        toSiteId: TO_SITE_ID,
        start: start ? start.toISOString() : null,
        end: end ? end.toISOString() : null,
        includeNullDates: INCLUDE_NULL_DATES,
        copiedDiaryRecords: copiedDiary,
        copiedPhotos,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
