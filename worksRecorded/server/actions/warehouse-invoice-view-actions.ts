import type { Prisma } from "@prisma/client";
import {
  buildWarehouseMaterialWhere,
  type WarehouseMaterialQueryInput,
  warehouseMaterialSelect,
} from "@/lib/bis/warehouse-material-query";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";

export type WarehouseInvoiceLocator =
  | { type: "batch"; value: string }
  | { type: "photo"; value: string }
  | {
      type: "number";
      invoiceNumber: string;
      supplierName: string | null;
      invoiceDate: string | null;
    };

export type WarehouseInvoiceSummary = {
  key: string;
  locator: WarehouseInvoiceLocator;
  invoiceNumber: string | null;
  supplierName: string | null;
  invoiceDate: Date | null;
  createdAt: Date;
  sourcePhoto: string | null;
  itemCount: number;
  totalCost: number;
  sentCount: number;
};

type InvoiceSourceRow = {
  id: string;
  invoiceNr: string | null;
  supplierName: string | null;
  invoiceDate: Date | null;
  createdAt: Date;
  sourcePhoto: string | null;
  importBatchId: string | null;
  cost: number | null;
  BISId: string | null;
};

function normalizeText(value: string | null) {
  return value?.trim() || null;
}

function getInvoiceIdentity(row: InvoiceSourceRow): {
  key: string;
  locator: WarehouseInvoiceLocator;
} | null {
  const importBatchId = normalizeText(row.importBatchId);
  if (importBatchId) {
    return {
      key: `batch:${importBatchId}`,
      locator: { type: "batch", value: importBatchId },
    };
  }

  const sourcePhoto = normalizeText(row.sourcePhoto);
  if (sourcePhoto) {
    return {
      key: `photo:${sourcePhoto}`,
      locator: { type: "photo", value: sourcePhoto },
    };
  }

  const invoiceNumber = normalizeText(row.invoiceNr);
  if (!invoiceNumber) return null;
  const supplierName = normalizeText(row.supplierName);
  const invoiceDate = row.invoiceDate?.toISOString() ?? null;
  return {
    key: `number:${invoiceNumber.toLocaleLowerCase()}|${supplierName?.toLocaleLowerCase() ?? ""}|${invoiceDate ?? ""}`,
    locator: {
      type: "number",
      invoiceNumber,
      supplierName,
      invoiceDate,
    },
  };
}

export function groupWarehouseInvoiceRows(
  rows: InvoiceSourceRow[],
): WarehouseInvoiceSummary[] {
  const groups = new Map<string, WarehouseInvoiceSummary>();

  for (const row of rows) {
    const identity = getInvoiceIdentity(row);
    if (!identity) continue;
    const current = groups.get(identity.key);
    if (current) {
      current.itemCount += 1;
      current.totalCost += row.cost ?? 0;
      current.sentCount += row.BISId ? 1 : 0;
      if (row.createdAt > current.createdAt) current.createdAt = row.createdAt;
      if (!current.invoiceNumber) current.invoiceNumber = normalizeText(row.invoiceNr);
      if (!current.supplierName) current.supplierName = normalizeText(row.supplierName);
      if (!current.invoiceDate) current.invoiceDate = row.invoiceDate;
      if (!current.sourcePhoto) current.sourcePhoto = normalizeText(row.sourcePhoto);
      continue;
    }

    groups.set(identity.key, {
      key: identity.key,
      locator: identity.locator,
      invoiceNumber: normalizeText(row.invoiceNr),
      supplierName: normalizeText(row.supplierName),
      invoiceDate: row.invoiceDate,
      createdAt: row.createdAt,
      sourcePhoto: normalizeText(row.sourcePhoto),
      itemCount: 1,
      totalCost: row.cost ?? 0,
      sentCount: row.BISId ? 1 : 0,
    });
  }

  return Array.from(groups.values()).sort((left, right) => {
    const leftDate = left.invoiceDate ?? left.createdAt;
    const rightDate = right.invoiceDate ?? right.createdAt;
    return rightDate.getTime() - leftDate.getTime() || left.key.localeCompare(right.key);
  });
}

async function requireWarehouseSite(siteId: string) {
  const user = await requireUser();
  const site = await orgCheck(user.id, siteId);
  if (!site) throw new Error("Project not found");
}

export async function fetchWarehouseInvoiceSummaries(
  siteId: string,
  input: WarehouseMaterialQueryInput,
) {
  "use server";

  await requireWarehouseSite(siteId);
  const matchingRows = await prisma.bISmaterialRecords.findMany({
    where: buildWarehouseMaterialWhere(siteId, input),
    select: {
      id: true,
      invoiceNr: true,
      supplierName: true,
      invoiceDate: true,
      createdAt: true,
      sourcePhoto: true,
      importBatchId: true,
      cost: true,
      BISId: true,
    },
  });
  const matchingInvoices = groupWarehouseInvoiceRows(matchingRows);
  if (!matchingInvoices.length) return [];

  const invoiceRows = await prisma.bISmaterialRecords.findMany({
    where: {
      siteId,
      OR: matchingInvoices.map((invoice) =>
        buildInvoiceLocatorWhere(siteId, invoice.locator),
      ),
    },
    select: {
      id: true,
      invoiceNr: true,
      supplierName: true,
      invoiceDate: true,
      createdAt: true,
      sourcePhoto: true,
      importBatchId: true,
      cost: true,
      BISId: true,
    },
  });
  return groupWarehouseInvoiceRows(invoiceRows);
}

function buildInvoiceLocatorWhere(
  siteId: string,
  locator: WarehouseInvoiceLocator,
): Prisma.BISmaterialRecordsWhereInput {
  if (locator.type === "batch") {
    return { siteId, importBatchId: locator.value };
  }
  if (locator.type === "photo") {
    return { siteId, sourcePhoto: locator.value };
  }

  return {
    siteId,
    invoiceNr: { equals: locator.invoiceNumber, mode: "insensitive" },
    supplierName: locator.supplierName,
    invoiceDate: locator.invoiceDate ? new Date(locator.invoiceDate) : null,
  };
}

export async function fetchWarehouseInvoiceRows(
  siteId: string,
  locator: WarehouseInvoiceLocator,
) {
  "use server";

  await requireWarehouseSite(siteId);
  return prisma.bISmaterialRecords.findMany({
    where: buildInvoiceLocatorWhere(siteId, locator),
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: warehouseMaterialSelect,
  });
}
