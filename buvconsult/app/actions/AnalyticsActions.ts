import { prisma } from "@/app/utils/db";

// Helper to get all months, to show 0 if no spendings that month
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr",
  "May", "Jun", "Jul", "Aug",
  "Sep", "Oct", "Nov", "Dec"
];

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

export async function getDailyAggregatedCosts(siteId: string) {
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