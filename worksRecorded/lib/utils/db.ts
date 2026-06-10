import { Prisma, PrismaClient } from "@prisma/client";
import { logPerfEvent } from "@/lib/observability/perf";

type GlobalForPrisma = {
  prisma?: PrismaClient;
  prismaPerfQueryListenerAttached?: boolean;
};

type PrismaClientWithQueryEvents = PrismaClient & {
  $on(eventType: "query", callback: (event: Prisma.QueryEvent) => void): PrismaClient;
};

const globalForPrisma = globalThis as unknown as GlobalForPrisma;

function isPrismaPerfLoggingEnabled() {
  return process.env.PERF_DB_LOGS_ENABLED === "true";
}

function shouldLogAllPrismaQueries() {
  return process.env.PERF_DB_LOGS_ALL === "true";
}

function getPrismaSlowQueryThresholdMs() {
  const value = Number(process.env.PERF_DB_SLOW_MS ?? 500);
  return Number.isFinite(value) && value >= 0 ? value : 500;
}

function getPrismaQueryOperation(query: string) {
  const match = query.trim().match(/^(SELECT|INSERT|UPDATE|DELETE|UPSERT)/i);
  return match?.[1]?.toLowerCase() ?? "other";
}

function getPrismaTableGroup(query: string) {
  if (query.includes('"BISmaterialRecords"')) return "bis_material_records";
  if (query.includes('"sitediaryrecords"')) return "site_diary_records";
  if (query.includes('"photos"')) return "photos";
  if (query.includes('"BisToken"')) return "bis_token";
  if (query.includes('"Site"')) return "site";
  return "other";
}

function shouldLogPrismaQuery(event: Prisma.QueryEvent, tableGroup: string) {
  if (shouldLogAllPrismaQueries()) return true;
  if (tableGroup !== "other") return true;

  return event.duration >= getPrismaSlowQueryThresholdMs();
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient(
    isPrismaPerfLoggingEnabled()
      ? { log: [{ emit: "event", level: "query" }] }
      : undefined,
  );

if (isPrismaPerfLoggingEnabled() && !globalForPrisma.prismaPerfQueryListenerAttached) {
  const prismaWithEvents = prisma as PrismaClientWithQueryEvents;

  prismaWithEvents.$on("query", (event) => {
    const tableGroup = getPrismaTableGroup(event.query);
    if (!shouldLogPrismaQuery(event, tableGroup)) return;

    logPerfEvent({
      route: "db.prisma",
      status: 200,
      totalMs: event.duration,
      extra: {
        target: "supabase.prisma",
        tableGroup,
        operation: getPrismaQueryOperation(event.query),
        slow: event.duration >= getPrismaSlowQueryThresholdMs(),
        prismaTarget: event.target,
      },
    });
  });

  globalForPrisma.prismaPerfQueryListenerAttached = true;
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
