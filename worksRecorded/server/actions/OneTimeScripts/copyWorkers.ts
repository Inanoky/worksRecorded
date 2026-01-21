// scripts/copyWorkersAndTimelog.ts
// Run: bun scripts/copyWorkersAndTimelog.ts
//
// Copies:
// 1) workers from FROM_SITE_ID -> TO_SITE_ID
// 2) timelog rows in date range -> TO_SITE_ID, remapping workerId to the copied worker in TO project
//
// Notes:
// - Non-destructive (only inserts).
// - Safe if START_DATE / END_DATE empty.
// - Timelogs with workerId that doesn't exist (or couldn't be mapped) will still be copied with workerId = null,
//   but workerName/WorkerSurname are preserved.
// - Running multiple times will duplicate data (no dedupe).

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

const INCLUDE_NULL_DATES = true;

const PAGE_SIZE = 500;
// =====================

function parseDateOrUndefined(s: string): Date | undefined {
  const v = (s || "").trim();
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function buildTimelogDateWhere(
  start?: Date,
  end?: Date,
  includeNullDates: boolean = true,
): Prisma.timelogWhereInput {
  if (!start && !end) return includeNullDates ? {} : { date: { not: null } };

  const range: Prisma.DateTimeNullableFilter = {};
  if (start) range.gte = start;
  if (end) range.lte = end;

  return includeNullDates ? { OR: [{ date: null }, { date: range }] } : { date: range };
}

function workerKey(w: { personalId: string | null; phone: string | null; name: string | null; surname: string | null }) {
  const pid = (w.personalId || "").trim().toLowerCase();
  const ph = (w.phone || "").trim().toLowerCase();
  const n = (w.name || "").trim().toLowerCase();
  const s = (w.surname || "").trim().toLowerCase();
  // prefer personalId, then phone, then name+surn
  if (pid) return `pid:${pid}`;
  if (ph) return `phone:${ph}`;
  return `name:${n}|${s}`;
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

  // -----------------------
  // 1) COPY workers
  // -----------------------
  const fromWorkers = await prisma.workers.findMany({
    where: { siteId: FROM_SITE_ID },
    select: {
      id: true,
      name: true,
      surname: true,
      personalId: true,
      phone: true,
      isClockedIn: true,
    },
  });

  // Build target lookup (existing workers in TO) to map without duplicates if possible
  const toWorkersExisting = await prisma.workers.findMany({
    where: { siteId: TO_SITE_ID },
    select: {
      id: true,
      name: true,
      surname: true,
      personalId: true,
      phone: true,
    },
  });

  const toKeyToId = new Map<string, string>();
  for (const w of toWorkersExisting) toKeyToId.set(workerKey(w), w.id);

  const fromIdToToId = new Map<string, string>();

  // Create missing workers (one-by-one to get ids)
  let createdWorkers = 0;
  for (const w of fromWorkers) {
    const key = workerKey(w);
    const existingToId = toKeyToId.get(key);
    if (existingToId) {
      fromIdToToId.set(w.id, existingToId);
      continue;
    }

    const created = await prisma.workers.create({
      data: {
        name: w.name ?? null,
        surname: w.surname ?? null,
        personalId: w.personalId ?? null,
        phone: w.phone ?? null,
        isClockedIn: false, // safer default on copied project
        siteId: TO_SITE_ID,
        organizationId: (toSite.organizationId ?? null) as any,
      },
      select: { id: true },
    });

    createdWorkers += 1;
    toKeyToId.set(key, created.id);
    fromIdToToId.set(w.id, created.id);
  }

  // -----------------------
  // 2) COPY timelog (remap workerId)
  // -----------------------
  const timelogDateWhere = buildTimelogDateWhere(start, end, INCLUDE_NULL_DATES);

  let copiedTimelog = 0;
  let cursorId: string | undefined;

  for (;;) {
    const rows = await prisma.timelog.findMany({
      where: { siteId: FROM_SITE_ID, ...timelogDateWhere },
      orderBy: { id: "asc" },
      take: PAGE_SIZE,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      select: {
        id: true,
        workerId: true,
        workerName: true,
        WorkerSurname: true,
        date: true,
        clockIn: true,
        clockOut: true,
        wocation: true,
        works: true,
        photo: true,
      },
    });

    if (rows.length === 0) break;

    const data: Prisma.timelogCreateManyInput[] = rows.map((t) => ({
      workerId: t.workerId ? fromIdToToId.get(t.workerId) ?? null : null,
      workerName: t.workerName ?? null,
      WorkerSurname: t.WorkerSurname ?? null,
      siteId: TO_SITE_ID,
      date: t.date ?? null,
      clockIn: t.clockIn ?? null,
      clockOut: t.clockOut ?? null,
      wocation: t.wocation ?? null,
      works: t.works ?? null,
      photo: t.photo ?? null,
      organizationId: (toSite.organizationId ?? null) as any,
    }));

    const res = await prisma.timelog.createMany({ data });
    copiedTimelog += res.count;
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
        fromWorkersCount: fromWorkers.length,
        createdWorkers,
        mappedWorkers: fromIdToToId.size,
        copiedTimelog,
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
