import { prisma } from "@/lib/utils/db";
import { startOfWeek, endOfWeek, endOfDay , addWeeks } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

// Helper to get all months, to show 0 if no spendings that month


const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];


/** Month totals (all categories combined) */
export async function getMonthlySpendings(siteId: string) {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      DATE_PART('year', "invoiceDate")::int   AS year,
      DATE_PART('month',"invoiceDate")::int   AS month,
      SUM(COALESCE("sum",0))                  AS spendings
    FROM "InvoiceItems"
    WHERE "invoiceDate" IS NOT NULL
      AND "siteId" = ${siteId}
    GROUP BY 1,2
    ORDER BY 1,2;
  `;

  return rows.map(r => ({
    month: `${MONTHS_SHORT[r.month - 1]} ${String(r.year).slice(-2)}`,
    spendings: Number(r.spendings), // keep as number for charts
  }));
}

/** Month totals split by top-level category */
export async function getCategoryMonthlySpendings(siteId: string) {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      DATE_PART('year', "invoiceDate")::int AS year,
      DATE_PART('month',"invoiceDate")::int AS month,
      COALESCE(NULLIF(TRIM(split_part("category", '.', 1)), ''), 'Other') AS parent_category,
      SUM(COALESCE("sum",0)) AS spendings
    FROM "InvoiceItems"
    WHERE "invoiceDate" IS NOT NULL
      AND "siteId" = ${siteId}
    GROUP BY 1,2,3
    ORDER BY 1,2,3;
  `;

  // Build sorted list of month labels present
  const monthLabels = Array.from(new Set(
    rows.map(r => `${MONTHS_SHORT[r.month - 1]} ${String(r.year).slice(-2)}`)
  )).sort((a, b) => {
    const [am, ay] = a.split(' '); const [bm, by] = b.split(' ');
    const ayFull = Number(`20${ay}`); const byFull = Number(`20${by}`);
    return ayFull - byFull || MONTHS_SHORT.indexOf(am) - MONTHS_SHORT.indexOf(bm);
  });

  // Unique categories
  const categories = Array.from(new Set(rows.map(r => r.parent_category)));

  // Index for quick lookup
  const key = (y: number, m: number, c: string) => `${y}-${m}-${c}`;
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(key(r.year, r.month, r.parent_category), Number(r.spendings));
  }

  // Assemble chart data
  const chartData = monthLabels.map(label => {
    const [monTxt, yr2] = label.split(' ');
    const monthNum = MONTHS_SHORT.indexOf(monTxt) + 1;
    const yearNum = Number(`20${yr2}`);
    const row: Record<string, number | string> = { month: label };
    for (const c of categories) {
      row[c] = map.get(key(yearNum, monthNum, c)) ?? 0;
    }
    return row;
  });

  return chartData;
}
//For the ChartAreaInteractive

export async function getDailyAggregatedCosts(siteId) {
  const data = await prisma.invoiceItems.groupBy({
    by: ['invoiceDate'],
    _sum: {
      sum: true,
    },
    where: {
      invoiceDate: { not: null },
      sum: { not: null },
      siteId, // will only return items matching this siteId
    },
    orderBy: {
      invoiceDate: 'asc',
    }
  });

  return data.map(row => ({
    date: row.invoiceDate,
    cost: Number(row._sum.sum) || 0,
  }));
}


// ------------------------Metrics dashboard -----------------------

//get previous week range in UTC based on timezone







export function currentWeekRangeUTC(tz: string = "Europe/Riga") {
  const now = new Date();
  const nowZoned = toZonedTime(now, tz);

  // Monday 00:00 of *this* week in tz
  const startOfThisWeekZoned = startOfWeek(nowZoned, { weekStartsOn: 1 });
  // End of *today* in tz (e.g., if Wed, it's Wed 23:59:59.999)
  const endOfTodayZoned = endOfDay(nowZoned);

  // Convert zoned boundaries to UTC instants for DB querying
  const startUTC = fromZonedTime(startOfThisWeekZoned, tz);
  const endUTC = fromZonedTime(endOfTodayZoned, tz);

  return { startUTC, endUTC };
}














export function previousWeekRangeUTC(tz: string = "Europe/Riga") {
  const now = new Date();
  const nowZoned = toZonedTime(now, tz);

  const startOfThisWeekZoned = startOfWeek(nowZoned, { weekStartsOn: 1 });
  const startOfPrevWeekZoned = addWeeks(startOfThisWeekZoned, -1);
  const endOfPrevWeekZoned = endOfWeek(startOfPrevWeekZoned, { weekStartsOn: 1 });

  const startUTC = fromZonedTime(startOfPrevWeekZoned, tz);
  const endUTC = fromZonedTime(endOfPrevWeekZoned, tz);

  return { startUTC, endUTC };
}
/**
 * Fetch Site Diary records for the *previous* Monday–Sunday week
 * relative to now, calculated in the given timezone.
 */
export async function getSiteDiaryPreviousWeek(siteId : string, tz: string = "Europe/Riga") {

  console.log("Fetching Site Diary records for previous week for siteId:", siteId);
  const { startUTC, endUTC } = previousWeekRangeUTC(tz);

  return prisma.sitediaryrecords.findMany({
    where: {
      Date: { gte: startUTC, lte: endUTC },
      siteId : siteId,
    },
 
    orderBy: { Date: "desc" },
  });
}

type MetricsData = {
  elementsAssembled: number;
  hoursWorked: number;
  additionalHoursWorked: number;
  delayedHours: number;
  reason: string;
};


export async function savePreviousWeekMetrics(siteId: string, metrics: Record<string, any>) {

  return prisma.analytics.upsert({
    where: { siteId },                       // uses the @unique field
    update: { lastWeekProgress : metrics },
    create: { siteId, lastWeekProgress:metrics },
  });
}


export async function getPreviousWeekMetrics(siteId: string): Promise<MetricsData | null> {
  const analytics = await prisma.analytics.findUnique({
    where: { siteId },
  });

  return analytics?.lastWeekProgress as MetricsData || null;
}






export async function getSiteDiaryCurrentsWeek(siteId : string, tz: string = "Europe/Riga") {

  console.log("Fetching Site Diary records for previous week for siteId:", siteId);
  const { startUTC, endUTC } = currentWeekRangeUTC(tz);

  return prisma.sitediaryrecords.findMany({
    where: {
      Date: { gte: startUTC, lte: endUTC },
      siteId : siteId,
    },
 
    orderBy: { Date: "desc" },
  });
}











export async function saveCurrentWeekMetrics(siteId: string, metrics: Record<string, any>) {

  return prisma.analytics.upsert({
    where: { siteId },                       // uses the @unique field
    update: { currentWeekProgress : metrics },
    create: { siteId, currentWeekProgress:metrics },
  });
}


export async function getCurrentWeekMetrics(siteId: string): Promise<MetricsData | null> {
  const analytics = await prisma.analytics.findUnique({
    where: { siteId },
  });

  return analytics?.currentWeekProgress as MetricsData || null;
}
