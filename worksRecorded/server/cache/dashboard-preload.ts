import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/utils/db";

const cacheFor = <T>(
  key: string[],
  tags: string[],
  loader: () => Promise<T>,
  revalidate = 300,
) => unstable_cache(loader, key, { tags, revalidate })();

function serializeDate(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

export function getCachedSitesForUser(
  userId: string,
  organizationId: string | null,
  isSuperUser: boolean,
) {
  return cacheFor(
    ["dashboard", "sites", userId, organizationId ?? "none", isSuperUser ? "1" : "0"],
    [`dashboard:user:${userId}:sites`],
    () =>
      prisma.site.findMany({
        where: isSuperUser ? {} : { organizationId: organizationId ?? "" },
        orderBy: { createdAt: "desc" },
      }),
  );
}

export function getCachedProjectName(siteId: string) {
  return cacheFor(
    ["dashboard", "projectName", siteId],
    [`dashboard:site:${siteId}:core`],
    async () => (await prisma.site.findUnique({ where: { id: siteId }, select: { name: true } }))?.name ?? "",
  );
}

export function getCachedInvoices(siteId: string) {
  return cacheFor(
    ["dashboard", "invoices", siteId],
    [`dashboard:site:${siteId}:invoices`],
    async () => {
      const invoices = await prisma.invoices.findMany({ where: { SiteId: siteId } });
      return invoices.map((inv) => ({
        ...inv,
        invoiceDate: serializeDate(inv.invoiceDate),
        paymentDate: serializeDate(inv.paymentDate),
      }));
    },
  );
}

export function getCachedInvoiceItems(siteId: string) {
  return cacheFor(
    ["dashboard", "invoiceItems", siteId],
    [`dashboard:site:${siteId}:invoices`],
    async () => {
      const invoiceItems = await prisma.invoiceItems.findMany({
        where: { siteId },
        include: { invoice: true },
      });

      return invoiceItems.map((inv) => ({
        ...inv,
        invoiceDate: serializeDate(inv.invoiceDate),
        paymentDate: serializeDate(inv.paymentDate),
        invoice: inv.invoice
          ? {
              ...inv.invoice,
              invoiceDate: serializeDate(inv.invoice.invoiceDate),
              paymentDate: serializeDate(inv.invoice.paymentDate),
            }
          : null,
      }));
    },
  );
}

export function getCachedDailyAggregatedCosts(siteId: string) {
  return cacheFor(
    ["dashboard", "dailyCosts", siteId],
    [`dashboard:site:${siteId}:analytics`],
    async () => {
      const data = await prisma.invoiceItems.groupBy({
        by: ["invoiceDate"],
        _sum: { sum: true },
        where: {
          invoiceDate: { not: null },
          sum: { not: null },
          siteId,
        },
        orderBy: { invoiceDate: "asc" },
      });

      return data.map((row) => ({
        date: row.invoiceDate,
        cost: Number(row._sum.sum) || 0,
      }));
    },
  );
}

export function getCachedCurrentWeekMetrics(siteId: string) {
  return cacheFor(
    ["dashboard", "currentWeekMetrics", siteId],
    [`dashboard:site:${siteId}:analytics`],
    async () => {
      const analytics = await prisma.analytics.findUnique({ where: { siteId } });
      return (analytics?.currentWeekProgress as Record<string, unknown>) ?? null;
    },
  );
}

export function getCachedPreviousWeekMetrics(siteId: string) {
  return cacheFor(
    ["dashboard", "previousWeekMetrics", siteId],
    [`dashboard:site:${siteId}:analytics`],
    async () => {
      const analytics = await prisma.analytics.findUnique({ where: { siteId } });
      return (analytics?.lastWeekProgress as Record<string, unknown>) ?? null;
    },
  );
}

export function getCachedCurrentWorkersOnSite(siteId: string) {
  return cacheFor(
    ["dashboard", "currentWorkers", siteId],
    [`dashboard:site:${siteId}:timesheets`],
    () =>
      prisma.timelog.findMany({
        where: {
          siteId,
          clockOut: null,
        },
        orderBy: { clockIn: "desc" },
      }),
  );
}

export function getCachedDocuments(siteId: string, organizationId: string | null) {
  return cacheFor(
    ["dashboard", "documents", siteId, organizationId ?? "none"],
    [`dashboard:site:${siteId}:documents`],
    () =>
      prisma.documents.findMany({
        where: {
          organizationId,
          siteId,
        },
      }),
  );
}

export async function preloadSiteDashboardData(siteId: string, organizationId: string | null) {
  await Promise.all([
    getCachedProjectName(siteId),
    getCachedInvoices(siteId),
    getCachedInvoiceItems(siteId),
    getCachedDailyAggregatedCosts(siteId),
    getCachedCurrentWeekMetrics(siteId),
    getCachedPreviousWeekMetrics(siteId),
    getCachedCurrentWorkersOnSite(siteId),
    getCachedDocuments(siteId, organizationId),
  ]);
}

export async function preloadUserDashboardData(
  userId: string,
  organizationId: string | null,
  isSuperUser: boolean,
) {
  const sites = await getCachedSitesForUser(userId, organizationId, isSuperUser);
  await Promise.all(
    sites.map((site) => preloadSiteDashboardData(site.id, organizationId)),
  );
  return sites;
}
