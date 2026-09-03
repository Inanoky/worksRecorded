import { PrismaClient } from "@prisma/client";
import {
  allocateZtcTaskAmountByTime,
  getZtcTaskIdentityKey,
} from "../flows/ztc-production/lib/ztc-task-amount-allocation";
import { ZTC_CANCELLED_SESSION_PREFIX } from "../flows/ztc-production/lib/ztc-session-markers";


//mmmf
type ZtcRecord = {
  id: string;
  siteId: string | null;
  organizationId: string | null;
  workerId: string | null;
  userId: string | null;
  Date_Custom_2: Date | null;
  createdAt: Date;
  Location: string | null;
  Location_Custom_1: string | null;
  Works: string | null;
  Works_Custom_1: string | null;
  Units: string | null;
  Amounts: number | null;
  TimeInvolved: number | null;
  Comments_Custom_1: string | null;
  Comments_Custom_2: string | null;
};
//nothing2:wqqwaaa
type DrawingMetadata = {
  type?: string;
  elements?: Array<{
    elementName?: string | null;
    totalAreaM2?: number | string | null;
    works?: Array<{
      name?: string | null;
      amountM2?: number | string | null;
    }>;
  }>;
};

const prisma = new PrismaClient();

function getArgValue(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isHourlyUnit(value: unknown) {
  const normalized = normalizeText(value).replace(/\.$/, "");
  return ["st", "h", "hr", "hour", "hours", "stunda", "stundas"].includes(normalized);
}

function positiveNumber(value: unknown) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function roundAmount(value: number) {
  return Math.round(value * 100) / 100;
}

function sameAmount(a: unknown, b: unknown) {
  const left = positiveNumber(a) ?? 0;
  const right = positiveNumber(b) ?? 0;
  return Math.abs(left - right) < 0.005;
}

function parseDayStart(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid --date-from value: ${value}`);
  date.setHours(0, 0, 0, 0);
  return date;
}

function parseDayEnd(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid --date-to value: ${value}`);
  date.setHours(23, 59, 59, 999);
  return date;
}

function isProductionDarbiRow(row: ZtcRecord) {
  if (!row.siteId || !row.organizationId) return false;
  if (!row.Location || !row.Location_Custom_1 || !row.Works || !row.Date_Custom_2) return false;
  if (normalizeText(row.Location) === "papilddarbi") return false;
  if (normalizeText(row.Location_Custom_1) === "papilddarbi") return false;
  if (normalizeText(row.Works_Custom_1) === "papilddarbi") return false;
  if (normalizeText(row.Works_Custom_1) === "papilddetalas") return false;
  if (normalizeText(row.Works) === "kvalitates kontrole") return false;
  if (isHourlyUnit(row.Units)) return false;
  if (row.Comments_Custom_1?.startsWith(ZTC_CANCELLED_SESSION_PREFIX)) return false;
  return true;
}

function getOriginalTaskAmount(args: {
  rows: ZtcRecord[];
  elementName: string;
  taskName: string;
}) {
  const normalizedElement = normalizeText(args.elementName);
  const normalizedTask = getZtcTaskIdentityKey(args.taskName);

  for (const row of args.rows) {
    const metadataValue = row.Comments_Custom_2;
    if (!metadataValue) continue;

    try {
      const metadata = JSON.parse(metadataValue) as DrawingMetadata;
      if (metadata.type !== "ztc_drawing_context" || !Array.isArray(metadata.elements)) {
        continue;
      }

      const element = metadata.elements.find(
        (candidate) => normalizeText(candidate.elementName) === normalizedElement,
      );
      const work = element?.works?.find(
        (candidate) => getZtcTaskIdentityKey(candidate.name) === normalizedTask,
      );
      const amount = positiveNumber(work?.amountM2) ?? positiveNumber(element?.totalAreaM2);
      if (amount != null) return amount;
    } catch {
      // Ignore non-JSON or older metadata and try the next row in the same group.
    }
  }

  return null;
}

function getGroupKey(row: ZtcRecord) {
  return [
    row.siteId,
    row.organizationId,
    normalizeText(row.Location),
    normalizeText(row.Location_Custom_1),
    getZtcTaskIdentityKey(row.Works),
  ].join("::");
}

function displayName(value: unknown) {
  return String(value ?? "").trim() || "-";
}

async function main() {
  const apply = hasFlag("apply");
  const siteId = getArgValue("site");
  const project = getArgValue("project");
  const element = getArgValue("element");
  const work = getArgValue("work");
  const dateFrom = parseDayStart(getArgValue("date-from"));
  const dateTo = parseDayEnd(getArgValue("date-to"));

  const where = {
    ...(siteId ? { siteId } : {}),
    ...(project ? { Location: project } : {}),
    ...(element ? { Location_Custom_1: element } : {}),
    ...(work ? { Works: work } : {}),
    ...(dateFrom || dateTo
      ? {
          Date: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
    Date_Custom_2: { not: null },
    NOT: [
      { Date: null },
      { Works: null },
      { Works: "" },
      { Comments_Custom_1: { startsWith: ZTC_CANCELLED_SESSION_PREFIX } },
    ],
  };

  const rows = (await prisma.ztcRecords.findMany({
    where,
    select: {
      id: true,
      siteId: true,
      organizationId: true,
      workerId: true,
      userId: true,
      Date_Custom_2: true,
      createdAt: true,
      Location: true,
      Location_Custom_1: true,
      Works: true,
      Works_Custom_1: true,
      Units: true,
      Amounts: true,
      TimeInvolved: true,
      Comments_Custom_1: true,
      Comments_Custom_2: true,
    },
    orderBy: [{ Location: "asc" }, { Location_Custom_1: "asc" }, { Works: "asc" }],
  })) as ZtcRecord[];

  const groups = new Map<string, ZtcRecord[]>();
  for (const row of rows.filter(isProductionDarbiRow)) {
    const key = getGroupKey(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const changes: Array<{
    row: ZtcRecord;
    nextAmount: number;
  }> = [];
  let skippedSingle = 0;
  let skippedNoAmount = 0;
  let checkedGroups = 0;
  let changedGroups = 0;

  for (const groupRows of groups.values()) {
    if (groupRows.length < 2) {
      skippedSingle += 1;
      continue;
    }

    checkedGroups += 1;
    groupRows.sort((a, b) => {
      const completedDiff =
        (a.Date_Custom_2?.getTime() ?? 0) - (b.Date_Custom_2?.getTime() ?? 0);
      if (completedDiff !== 0) return completedDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const first = groupRows[0];
    const originalAmount =
      getOriginalTaskAmount({
        rows: groupRows,
        elementName: first.Location_Custom_1 ?? "",
        taskName: first.Works ?? "",
      }) ?? Math.max(...groupRows.map((row) => positiveNumber(row.Amounts) ?? 0));

    if (!Number.isFinite(originalAmount) || originalAmount <= 0) {
      skippedNoAmount += 1;
      continue;
    }

    const allocations = allocateZtcTaskAmountByTime(
      originalAmount,
      groupRows.map((row) => ({
        id: row.id,
        workerId: row.workerId ?? row.userId,
        hours: row.TimeInvolved,
      })),
    );
    const allocationById = new Map(allocations.map((item) => [item.id, item.amount]));
    const groupChanges = groupRows
      .map((row) => ({
        row,
        nextAmount: roundAmount(allocationById.get(row.id) ?? 0),
      }))
      .filter((item) => !sameAmount(item.row.Amounts, item.nextAmount));

    if (!groupChanges.length) continue;
    changedGroups += 1;
    changes.push(...groupChanges);

    console.log(
      [
        "",
        `${displayName(first.Location)} / ${displayName(first.Location_Custom_1)} / ${displayName(first.Works)}`,
        `  total m2: ${originalAmount}; rows: ${groupRows.length}`,
        ...groupChanges.map(
          ({ row, nextAmount }) =>
            `  ${row.id}: ${row.Amounts ?? "-"} -> ${nextAmount} m2 (${row.TimeInvolved ?? 0} h)`,
        ),
      ].join("\n"),
    );
  }

  if (apply && changes.length) {
    await prisma.$transaction(
      changes.map(({ row, nextAmount }) =>
        prisma.ztcRecords.update({
          where: { id: row.id },
          data: { Amounts: nextAmount },
        }),
      ),
    );
  }

  console.log(
    [
      "",
      apply ? "Applied ZTC split-work m2 rebalance." : "Dry run only. Add --apply to write changes.",
      `Fetched records: ${rows.length}`,
      `Production Darbi groups checked: ${checkedGroups}`,
      `Groups skipped because only one row: ${skippedSingle}`,
      `Groups skipped without an amount: ${skippedNoAmount}`,
      `Groups with changes: ${changedGroups}`,
      `Rows ${apply ? "updated" : "to update"}: ${changes.length}`,
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
