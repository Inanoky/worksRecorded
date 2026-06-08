"use server";

import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import ztcSiteDiaryRecordsMap from "@/components/sitediary/configs/ZTC/siteDiaryRecordsMap.json";
import { getOrganizationIdByUserId, orgCheck } from "@/server/actions/shared-actions";

const ZTC_ORGANIZATION_ID = "21511437-f6ab-402b-aa2d-613110eb61da";
const ZTC_SITE_ID = "4c26c435-dd19-49d7-ad60-981eb1eeaeff";

function ensureZtcSite(siteId: string | null | undefined) {
  if (siteId !== ZTC_SITE_ID) {
    throw new Error("ZTC darbības var izmantot tikai ZTC objektam.");
  }
}

async function requireZtcAccess(siteId: string) {
  ensureZtcSite(siteId);
  const user = await requireUser();
  const site = await orgCheck(user.id, siteId);
  const organizationId = await getOrganizationIdByUserId(user.id);

  if (!site || organizationId !== ZTC_ORGANIZATION_ID) {
    throw new Error("Jums nav piekļuves ZTC būvdarbu žurnālam.");
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
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : undefined;
}

function normalizePayrollTextNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) return null;
  return Number.isFinite(Number(normalized)) ? normalized : undefined;
}

function sanitizeZtcRecordRow(row: Record<string, any>) {
  return {
    Date: normalizeDate(row.Date) ?? null,
    Date_Custom_1: normalizeNullableDate(row.Date_Custom_1),
    Date_Custom_2: normalizeNullableDate(row.Date_Custom_2),
    Location: row.Location || null,
    Location_Custom_1: row.Location_Custom_1 || null,
    Location_Custom_2: row.Location_Custom_2 || null,
    Works: row.Works || null,
    Works_Custom_1: row.Works_Custom_1 || null,
    Works_Custom_2: row.Works_Custom_2 || null,
    Comments: row.Comments || null,
    Comments_Custom_1: row.Comments_Custom_1 || null,
    Comments_Custom_2: row.Comments_Custom_2 || null,
    originalUserComment: row.originalUserComment || null,
    Units: "m2",
    Amounts: normalizeNumber(row.Amounts) ?? null,
    WorkersInvolved: normalizeNumber(row.WorkersInvolved) ?? null,
    TimeInvolved: normalizeNumber(row.TimeInvolved) ?? null,
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
    Photos: Array.isArray(rec.Photos) ? rec.Photos : [],
    createdBy: createdBy || "N/A",
  };
}

async function loadZtcSiteDiaryConfig(siteId: string) {
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

async function loadZtcSiteDiaryRecords(args: { date: string }) {
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
      Photos: true,
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

export async function getZtcSiteDiaryConfig(siteId: string) {
  await requireZtcAccess(siteId);
  return loadZtcSiteDiaryConfig(siteId);
}

export async function getZtcSiteDiaryRecords(args: { siteId: string; date: string }) {
  await requireZtcAccess(args.siteId);
  return loadZtcSiteDiaryRecords({ date: args.date });
}

export async function getZtcDialogPrefetchData(args: { siteId: string; date: string }) {
  await requireZtcAccess(args.siteId);

  const [config, rows] = await Promise.all([
    loadZtcSiteDiaryConfig(args.siteId),
    loadZtcSiteDiaryRecords({ date: args.date }),
  ]);

  return { config, rows };
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

  if (!rows.length) return { ok: false, message: "Nav ierakstu, ko pievienot." };

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
    return { ok: false, message: "ZTC ieraksts nav atrasts." };
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

  const rate = normalizePayrollTextNumber(args.rate);
  const coefficient = normalizePayrollTextNumber(args.coefficient);
  const bonus = normalizeNumber(args.bonus);

  if (rate === undefined) {
    return { ok: false, message: "Algas likmei jābūt derīgam skaitlim." };
  }

  if (coefficient === undefined) {
    return { ok: false, message: "Algas koeficientam jābūt derīgam skaitlim." };
  }

  if (args.bonus !== "" && args.bonus != null && bonus === undefined) {
    return { ok: false, message: "Algas bonusam jābūt derīgam skaitlim." };
  }

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
    return { ok: false, message: "ZTC ieraksts nav atrasts." };
  }

  return { ok: true };
}
