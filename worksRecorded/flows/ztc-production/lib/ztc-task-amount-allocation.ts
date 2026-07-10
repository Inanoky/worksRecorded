import { prisma } from "@/lib/utils/db";
import { ZTC_CANCELLED_SESSION_PREFIX } from "@/flows/ztc-production/lib/ztc-session-markers";

type AllocationInput = {
  id: string;
  workerId: string | null;
  hours: number | null;
};

type DrawingMetadata = {
  type?: string;
  elements?: Array<{
    elementName?: string;
    totalAreaM2?: number | null;
    works?: Array<{
      name?: string;
      amountM2?: number | null;
    }>;
  }>;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isHourlyUnit(value: unknown) {
  const normalized = normalizeText(value).replace(/\.$/, "");
  return ["st", "h", "hr", "hour", "hours", "stunda", "stundas"].includes(normalized);
}

function normalizeTaskName(value: unknown) {
  return normalizeText(value)
    .replace(/^t\s*\d+(?=\s|[-/]|$)/i, "tl")
    .replace(/^t(?!l)(?=\s|[-/]|$)/i, "tl");
}

export function getZtcTaskIdentityKey(value: unknown) {
  const normalized = normalizeTaskName(value);
  const codeMatch = normalized.match(
    /^\s*((?:[lr]\s*\d\s*\/\s*[bt]\s*\d)|tl|l\s*0)(?=\s|[-/]|$)/i,
  );

  if (codeMatch?.[1]) {
    return codeMatch[1].replace(/\s+/g, "").toLowerCase();
  }

  return normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function positiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function allocateZtcTaskAmountByTime(
  totalAmount: number,
  rows: AllocationInput[],
) {
  if (!Number.isFinite(totalAmount) || totalAmount < 0 || rows.length === 0) {
    return [];
  }

  const totalCents = Math.round(totalAmount * 100);
  const normalizedHours = rows.map((row) => positiveNumber(row.hours) ?? 0);
  const totalHours = normalizedHours.reduce((sum, hours) => sum + hours, 0);
  const weights =
    totalHours > 0
      ? normalizedHours
      : rows.map(() => 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  let allocatedCents = 0;
  return rows.map((row, index) => {
    const amountCents =
      index === rows.length - 1
        ? totalCents - allocatedCents
        : Math.round((totalCents * weights[index]) / totalWeight);
    allocatedCents += amountCents;

    return {
      id: row.id,
      amount: amountCents / 100,
    };
  });
}

function getOriginalTaskAmount(args: {
  metadataValues: Array<string | null>;
  elementName: string;
  taskName: string;
}) {
  const normalizedElement = normalizeText(args.elementName);
  const normalizedTask = getZtcTaskIdentityKey(args.taskName);

  for (const value of args.metadataValues) {
    if (!value) continue;

    try {
      const metadata = JSON.parse(value) as DrawingMetadata;
      if (
        metadata.type !== "ztc_drawing_context" ||
        !Array.isArray(metadata.elements)
      ) {
        continue;
      }

      const element = metadata.elements.find(
        (candidate) =>
          normalizeText(candidate.elementName) === normalizedElement,
      );
      const work = element?.works?.find(
        (candidate) => getZtcTaskIdentityKey(candidate.name) === normalizedTask,
      );
      const amount =
        positiveNumber(work?.amountM2) ??
        positiveNumber(element?.totalAreaM2);
      if (amount != null) return amount;
    } catch {
      // Ignore old or unrelated metadata and try the next matching record.
    }
  }

  return null;
}

export async function rebalanceZtcCompletedTaskAmounts(args: {
  recordId: string;
  fallbackTotalAmount?: number | null;
}) {
  const anchor = await prisma.ztcRecords.findUnique({
    where: { id: args.recordId },
    select: {
      siteId: true,
      organizationId: true,
      Location: true,
      Location_Custom_1: true,
      Works: true,
      Works_Custom_1: true,
      Units: true,
      Date_Custom_2: true,
    },
  });

  if (
    !anchor?.siteId ||
    !anchor.organizationId ||
    !anchor.Location ||
    !anchor.Location_Custom_1 ||
    !anchor.Works ||
    !anchor.Date_Custom_2 ||
    normalizeText(anchor.Location) === "papilddarbi" ||
    normalizeText(anchor.Works_Custom_1) === "papilddetāļas" ||
    normalizeText(anchor.Works) === "kvalitātes kontrole" ||
    isHourlyUnit(anchor.Units)
  ) {
    return { updated: 0, totalAmount: null };
  }

  const candidates = await prisma.ztcRecords.findMany({
    where: {
      siteId: anchor.siteId,
      organizationId: anchor.organizationId,
      Location: anchor.Location,
      Location_Custom_1: anchor.Location_Custom_1,
      Date_Custom_2: { not: null },
      NOT: [{ Comments_Custom_1: { startsWith: ZTC_CANCELLED_SESSION_PREFIX } }],
    },
    select: {
      id: true,
      workerId: true,
      userId: true,
      Works: true,
      Works_Custom_1: true,
      Units: true,
      Amounts: true,
      TimeInvolved: true,
      Comments_Custom_2: true,
      Date_Custom_2: true,
    },
    orderBy: [{ Date_Custom_2: "asc" }, { createdAt: "asc" }],
  });

  const normalizedTask = getZtcTaskIdentityKey(anchor.Works);
  const matchingRows = candidates.filter(
    (row) =>
      getZtcTaskIdentityKey(row.Works) === normalizedTask &&
      normalizeText(row.Works_Custom_1) !== "papilddetāļas" &&
      !isHourlyUnit(row.Units),
  );
  if (matchingRows.length === 0) {
    return { updated: 0, totalAmount: null };
  }

  const originalAmount =
    getOriginalTaskAmount({
      metadataValues: matchingRows.map((row) => row.Comments_Custom_2),
      elementName: anchor.Location_Custom_1,
      taskName: anchor.Works,
    }) ??
    positiveNumber(args.fallbackTotalAmount) ??
    Math.max(...matchingRows.map((row) => positiveNumber(row.Amounts) ?? 0));

  if (!Number.isFinite(originalAmount) || originalAmount <= 0) {
    return { updated: 0, totalAmount: null };
  }

  const distinctWorkers = new Set(
    matchingRows
      .map((row) => row.workerId ?? row.userId)
      .filter((actorId): actorId is string => Boolean(actorId)),
  );
  const allocations =
    distinctWorkers.size >= 2
      ? allocateZtcTaskAmountByTime(
          originalAmount,
          matchingRows.map((row) => ({
            id: row.id,
            workerId: row.workerId ?? row.userId,
            hours: row.TimeInvolved,
          })),
        )
      : matchingRows.map((row) => ({ id: row.id, amount: originalAmount }));

  await prisma.$transaction(
    allocations.map((allocation) =>
      prisma.ztcRecords.update({
        where: { id: allocation.id },
        data: { Amounts: allocation.amount },
      }),
    ),
  );

  return {
    updated: allocations.length,
    totalAmount: originalAmount,
  };
}
