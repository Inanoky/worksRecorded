"use server";

import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import ztcSiteDiaryRecordsMap from "@/components/sitediary/configs/ZTC/siteDiaryRecordsMap.json";
import { getOrganizationIdByUserId, orgCheck } from "@/server/actions/shared-actions";

const ZTC_ORGANIZATION_ID = "21511437-f6ab-402b-aa2d-613110eb61da";
const ZTC_SITE_ID = "4c26c435-dd19-49d7-ad60-981eb1eeaeff";

function ensureZtcSite(siteId: string | null | undefined) {
  if (siteId !== ZTC_SITE_ID) {
    throw new Error("ZTC actions can only be used for the ZTC site.");
  }
}

async function requireZtcAccess(siteId: string) {
  ensureZtcSite(siteId);
  const user = await requireUser();
  const site = await orgCheck(user.id, siteId);
  const organizationId = await getOrganizationIdByUserId(user.id);

  if (!site || organizationId !== ZTC_ORGANIZATION_ID) {
    throw new Error("You do not have access to the ZTC site diary.");
  }

  return user;
}

function normalizeDate(value: unknown) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeNullableDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function sanitizeZtcRecordRow(row: Record<string, any>) {
  return {
    Date: normalizeDate(row.Date),
    Date_Custom_1: normalizeNullableDate(row.Date_Custom_1),
    Date_Custom_2: normalizeNullableDate(row.Date_Custom_2),
    Location: row.Location || undefined,
    Location_Custom_1: row.Location_Custom_1 || undefined,
    Location_Custom_2: row.Location_Custom_2 || undefined,
    Works: row.Works || undefined,
    Works_Custom_1: row.Works_Custom_1 || undefined,
    Works_Custom_2: row.Works_Custom_2 || undefined,
    Comments: row.Comments || undefined,
    Comments_Custom_1: row.Comments_Custom_1 || undefined,
    Comments_Custom_2: row.Comments_Custom_2 || undefined,
    originalUserComment: row.originalUserComment || undefined,
    Units: "m2",
    Amounts: normalizeNumber(row.Amounts),
    WorkersInvolved: normalizeNumber(row.WorkersInvolved),
    TimeInvolved: normalizeNumber(row.TimeInvolved),
  };
}

function formatCreatorName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
) {
  return [firstName, lastName].filter(Boolean).join(" ");
}

function mapZtcRecord(rec: any) {
  const createdBy = rec.User
    ? formatCreatorName(rec.User.firstName, rec.User.lastName)
    : rec.Worker
      ? formatCreatorName(rec.Worker.name, rec.Worker.surname)
      : "";

  return {
    id: rec.id,
    Date: rec.Date,
    Date_Custom_1: rec.Date_Custom_1,
    Date_Custom_2: rec.Date_Custom_2,
    Location: rec.Location || "",
    Location_Custom_1: rec.Location_Custom_1 || "",
    Location_Custom_2: rec.Location_Custom_2 || "",
    Works: rec.Works || "",
    Works_Custom_1: rec.Works_Custom_1 || "",
    Works_Custom_2: rec.Works_Custom_2 || "",
    Units: "m2",
    Amounts: rec.Amounts?.toString() || "",
    WorkersInvolved: rec.WorkersInvolved?.toString() || "",
    TimeInvolved: rec.TimeInvolved?.toString() || "",
    Comments: rec.Comments || "",
    Comments_Custom_1: rec.Comments_Custom_1 || "",
    Comments_Custom_2: rec.Comments_Custom_2 || "",
    originalUserComment: rec.originalUserComment || "",
    createdBy: createdBy || "N/A",
  };
}

export async function getZtcSiteDiaryConfig(siteId: string) {
  await requireZtcAccess(siteId);

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { siteDiaryRecordsMap: true },
  });

  const baseMap = structuredClone(ztcSiteDiaryRecordsMap as Record<string, any>);
  const savedMap =
    site?.siteDiaryRecordsMap && typeof site.siteDiaryRecordsMap === "object"
      ? (site.siteDiaryRecordsMap as Record<string, any>)
      : null;

  if (!savedMap) return baseMap;

  for (const [fieldKey, fieldConfig] of Object.entries(savedMap)) {
    if (
      fieldConfig &&
      typeof fieldConfig === "object" &&
      "DropDownOptions" in fieldConfig &&
      baseMap[fieldKey]
    ) {
      baseMap[fieldKey] = {
        ...baseMap[fieldKey],
        DropDownOptions: (fieldConfig as Record<string, any>).DropDownOptions,
      };
    }
  }

  return baseMap;
}

export async function getZtcSiteDiaryRecords(args: { siteId: string; date: string }) {
  await requireZtcAccess(args.siteId);

  const start = new Date(args.date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(args.date);
  end.setHours(23, 59, 59, 999);

  const records = await prisma.sitediaryrecords.findMany({
    where: {
      siteId: ZTC_SITE_ID,
      organizationId: ZTC_ORGANIZATION_ID,
      OR: [
        { Date: { gte: start, lte: end } },
        { Date_Custom_1: { gte: start, lte: end } },
      ],
    },
    orderBy: [{ Date: "asc" }, { Date_Custom_1: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      Date: true,
      Date_Custom_1: true,
      Date_Custom_2: true,
      Location: true,
      Location_Custom_1: true,
      Location_Custom_2: true,
      Works: true,
      Works_Custom_1: true,
      Works_Custom_2: true,
      Units: true,
      Amounts: true,
      WorkersInvolved: true,
      TimeInvolved: true,
      Comments: true,
      Comments_Custom_1: true,
      Comments_Custom_2: true,
      originalUserComment: true,
      User: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      Worker: {
        select: {
          name: true,
          surname: true,
        },
      },
    },
  });

  return records.map(mapZtcRecord);
}

export async function createZtcSiteDiaryRecords(args: {
  siteId: string;
  rows: Array<Record<string, any>>;
}) {
  const user = await requireZtcAccess(args.siteId);

  const rows = args.rows.map((row) => ({
    userId: user.id,
    siteId: ZTC_SITE_ID,
    organizationId: ZTC_ORGANIZATION_ID,
    ...sanitizeZtcRecordRow(row),
    Photos: [],
  }));

  if (!rows.length) return { ok: false, message: "No records to insert" };

  await prisma.sitediaryrecords.createMany({ data: rows });
  return { ok: true, count: rows.length };
}

export async function updateZtcSiteDiaryRecord(args: {
  siteId: string;
  id: string;
  [key: string]: any;
}) {
  await requireZtcAccess(args.siteId);
  const { id, siteId, _tempId, createdBy, ...row } = args;

  const result = await prisma.sitediaryrecords.updateMany({
    where: {
      id,
      siteId: ZTC_SITE_ID,
      organizationId: ZTC_ORGANIZATION_ID,
    },
    data: sanitizeZtcRecordRow(row),
  });

  if (result.count !== 1) {
    return { ok: false, message: "ZTC record not found" };
  }

  const record = await prisma.sitediaryrecords.findUnique({ where: { id } });
  return { ok: true, record };
}

export async function deleteZtcSiteDiaryRecord(args: { siteId: string; id: string }) {
  await requireZtcAccess(args.siteId);

  await prisma.sitediaryrecords.deleteMany({
    where: {
      id: args.id,
      siteId: ZTC_SITE_ID,
      organizationId: ZTC_ORGANIZATION_ID,
    },
  });

  return { success: true };
}

export async function updateZtcPayrollFields(args: {
  siteId: string;
  id: string;
  rate?: string | number | null;
  coefficient?: string | number | null;
  bonus?: string | number | null;
}) {
  await requireZtcAccess(args.siteId);

  const rate = args.rate === "" || args.rate == null ? null : String(args.rate);
  const coefficient =
    args.coefficient === "" || args.coefficient == null
      ? null
      : String(args.coefficient);
  const bonus = normalizeNumber(args.bonus);

  const result = await prisma.sitediaryrecords.updateMany({
    where: {
      id: args.id,
      siteId: ZTC_SITE_ID,
      organizationId: ZTC_ORGANIZATION_ID,
    },
    data: {
      Location_Custom_2: rate,
      Works_Custom_2: coefficient,
      WorkersInvolved: bonus ?? null,
    },
  });

  if (result.count !== 1) {
    return { ok: false, message: "ZTC record not found" };
  }

  return { ok: true };
}
