import { auditZtcMutation } from "@/flows/ztc-production/lib/ztc-record-audit";
import { ZTC_CANCELLED_SESSION_PREFIX } from "@/flows/ztc-production/lib/ztc-session-markers";
import { getZtcTaskIdentityKey } from "@/flows/ztc-production/lib/ztc-task-identity";
import { prisma } from "@/lib/utils/db";

export { getZtcTaskIdentityKey } from "@/flows/ztc-production/lib/ztc-task-identity";

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

export function isZtcAreaAllocationEligible(row: {
  Units?: unknown;
  Works_Custom_1?: unknown;
  Location?: unknown;
  Works?: unknown;
}) {
  return ["m2", "m²"].includes(normalizeText(row.Units)) &&
    !["papilddarbi", "papilddetāļas"].includes(normalizeText(row.Works_Custom_1)) &&
    normalizeText(row.Location) !== "papilddarbi" &&
    normalizeText(row.Works) !== "kvalitātes kontrole";
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
      const amount = work
        ? positiveNumber(work.amountM2) ?? positiveNumber(element?.totalAreaM2)
        : null;
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
    !isZtcAreaAllocationEligible(anchor)
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
      isZtcAreaAllocationEligible(row),
  );
  if (matchingRows.length === 0) {
    return { updated: 0, totalAmount: null };
  }

  const originalAmount =
    getOriginalTaskAmount({
      metadataValues: matchingRows.map((row) => row.Comments_Custom_2),
      elementName: anchor.Location_Custom_1,
      taskName: anchor.Works,
    });

  if (originalAmount == null || !Number.isFinite(originalAmount) || originalAmount <= 0) {
    return { updated: 0, totalAmount: null };
  }

  const allocations =
    matchingRows.length >= 2
      ? allocateZtcTaskAmountByTime(
          originalAmount,
          matchingRows.map((row) => ({
            id: row.id,
            workerId: row.workerId ?? row.userId,
            hours: row.TimeInvolved,
          })),
        )
      : matchingRows.map((row) => ({ id: row.id, amount: originalAmount }));

  const updated = await auditZtcMutation("rebalanceZtcCompletedTaskAmounts", async (tx) => {
    const manualQuantityEdit = await tx.ztcRecordAudit.findFirst({
      where: {
        recordId: { in: matchingRows.map((row) => row.id) },
        source: "manual",
        operation: "UPDATE",
        changedFields: { has: "Amounts" },
      },
      select: { id: true },
    });
    if (manualQuantityEdit) return 0;
    for (const allocation of allocations) {
      const snapshot = matchingRows.find((row) => row.id === allocation.id)!;
      const result = await tx.ztcRecords.updateMany({
        where: {
          id: allocation.id,
          Amounts: snapshot.Amounts,
          TimeInvolved: snapshot.TimeInvolved,
          Works: snapshot.Works,
          Units: snapshot.Units,
          Location: anchor.Location,
          Location_Custom_1: anchor.Location_Custom_1,
        },
        data: { Amounts: allocation.amount },
      });
      if (result.count !== 1) throw new Error("ZTC allocation changed concurrently; retry required");
    }
    return allocations.length;
  }, { details: { totalAmount: originalAmount, allocations } });

  return {
    updated,
    totalAmount: originalAmount,
  };
}
