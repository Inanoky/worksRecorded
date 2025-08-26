import { prisma } from "@/app/utils/db";

// Helper to get all months, to show 0 if no spendings that month
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr",
  "May", "Jun", "Jul", "Aug",
  "Sep", "Oct", "Nov", "Dec"
];

export async function getMonthlySpendings(siteId) {
  // Raw SQL for performance & grouping by month
  // This works for PostgreSQL; adjust if using MySQL/SQLite

 const data = await prisma.$queryRaw<any[]>`
    SELECT
      EXTRACT(YEAR FROM TO_DATE("invoiceDate", 'YYYY-MM-DD')) AS year,
      EXTRACT(MONTH FROM TO_DATE("invoiceDate", 'YYYY-MM-DD')) AS month,
      SUM(COALESCE("sum",0)) AS spendings
    FROM "InvoiceItems"
    WHERE "invoiceDate" IS NOT NULL
      AND "siteId" = ${siteId}
    GROUP BY year, month
    ORDER BY year, month;
  `;



  // Format result as required
   const chartData = data.map(d => ({
    month: `${MONTHS[d.month - 1]} ${String(d.year).slice(-2)}`,
    spendings: Number(d.spendings).toFixed(0)
}));



  return chartData;
}




export async function getCategoryMonthlySpendings(siteId) {
  const data = await prisma.$queryRaw<any[]>`
    SELECT
      EXTRACT(YEAR FROM TO_DATE("invoiceDate", 'YYYY-MM-DD')) AS year,
      EXTRACT(MONTH FROM TO_DATE("invoiceDate", 'YYYY-MM-DD')) AS month,
      split_part("category", '.', 1) as parent_category,
      SUM(COALESCE("sum",0)) AS spendings
    FROM "InvoiceItems"
    WHERE "invoiceDate" IS NOT NULL
      AND "siteId" = ${siteId}
    GROUP BY year, month, parent_category
    ORDER BY year, month, parent_category;
  `;

  console.log(`this is MonthlyCategoryCahrt before Processing ${JSON.stringify(data)}`)

 const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Build sorted array of all months (labels) present in the data
const uniqueMonths = Array.from(new Set(
  data.map(d =>
    `${MONTHS_SHORT[parseInt(d.month, 10) - 1]} ${String(d.year).slice(-2)}`
  )
)).sort((a, b) => {
  // Sort by year, then month
  const [aMon, aYr] = a.split(' ');
  const [bMon, bYr] = b.split(' ');
  return (
    Number(`20${aYr}`) - Number(`20${bYr}`) ||
    MONTHS_SHORT.indexOf(aMon) - MONTHS_SHORT.indexOf(bMon)
  );
});

// Build array of all categories (handle "" as "Other")
const uniqueCategories = Array.from(new Set(
  data.map(d => d.parent_category && d.parent_category.trim() ? d.parent_category : "Other")
));

// Build final chartData for recharts
const chartData = uniqueMonths.map(monthLabel => {
  // Get numbers for year and month
  const [mon, yr] = monthLabel.split(' ');
  const monthNum = MONTHS_SHORT.indexOf(mon) + 1;
  const yearNum = `20${yr}`;
  // New row with dynamic keys
  const row = { month: monthLabel };
  for (const category of uniqueCategories) {
    // Use "Other" for empty/blank
    const catKey = category && category.trim() ? category : "Other";
    // Find spendings for this month/category
    const found = data.find(
      d =>
        ((d.parent_category && d.parent_category.trim()) ? d.parent_category : "Other") === catKey &&
        String(d.month) === String(monthNum) &&
        String(d.year).slice(-2) === yr
    );
    row[catKey] = found ? Number(found.spendings) : 0;
  }
  return row;
});

  console.log(`this is MonthlyCategoryCahrt data ${JSON.stringify(chartData)}`)

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