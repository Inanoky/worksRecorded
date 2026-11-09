import type { Prisma } from "@prisma/client";
import {
  buildWarehouseMaterialWhere,
  type WarehouseMaterialQueryInput,
  warehouseMaterialSelect,
} from "@/lib/bis/warehouse-material-query";
import { resolveInvoiceSupplierName } from "@/lib/bis/invoice-supplier-map";
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
  movableRowIds: string[];
};

export type WarehouseInvoicePage = {
  invoices: WarehouseInvoiceSummary[];
  nextOffset: number | null;
  totalCount: number;
};

const DEFAULT_INVOICE_PAGE_SIZE = 30;
const MAX_INVOICE_PAGE_SIZE = 100;

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
      if (!row.BISId) current.movableRowIds.push(row.id);
      if (row.createdAt > current.createdAt) current.createdAt = row.createdAt;
      if (!current.invoiceNumber) current.invoiceNumber = normalizeText(row.invoiceNr);
      if (!current.supplierName) {
        current.supplierName = resolveInvoiceSupplierName(
          row.invoiceNr,
          row.supplierName,
        );
      }
      if (!current.invoiceDate) current.invoiceDate = row.invoiceDate;
      if (!current.sourcePhoto) current.sourcePhoto = normalizeText(row.sourcePhoto);
      continue;
    }

    groups.set(identity.key, {
      key: identity.key,
      locator: identity.locator,
      invoiceNumber: normalizeText(row.invoiceNr),
      supplierName: resolveInvoiceSupplierName(row.invoiceNr, row.supplierName),
      invoiceDate: row.invoiceDate,
      createdAt: row.createdAt,
      sourcePhoto: normalizeText(row.sourcePhoto),
      itemCount: 1,
      totalCost: row.cost ?? 0,
      sentCount: row.BISId ? 1 : 0,
      movableRowIds: row.BISId ? [] : [row.id],
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
  pagination: { offset?: number; limit?: number } = {},
): Promise<WarehouseInvoicePage> {
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
  const offset = Math.max(0, Math.floor(pagination.offset ?? 0));
  const limit = Math.min(
    MAX_INVOICE_PAGE_SIZE,
    Math.max(1, Math.floor(pagination.limit ?? DEFAULT_INVOICE_PAGE_SIZE)),
  );
  const pageInvoices = matchingInvoices.slice(offset, offset + limit);
  if (!pageInvoices.length) {
    return {
      invoices: [],
      nextOffset: null,
      totalCount: matchingInvoices.length,
    };
  }

  const invoiceRows = await prisma.bISmaterialRecords.findMany({
    where: {
      siteId,
      OR: pageInvoices.map((invoice) =>
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
  return {
    invoices: groupWarehouseInvoiceRows(invoiceRows),
    nextOffset:
      offset + pageInvoices.length < matchingInvoices.length
        ? offset + pageInvoices.length
        : null,
    totalCount: matchingInvoices.length,
  };
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
