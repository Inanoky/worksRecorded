import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/db";

export const WAREHOUSE_MATERIAL_PAGE_SIZE = 50;
export const WAREHOUSE_MATERIAL_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const WAREHOUSE_CONFIG_FILTER_ALL = "all";
export const WAREHOUSE_CONFIG_FILTER_CONFIGURED = "__configured__";
export const WAREHOUSE_CONFIG_FILTER_UNCONFIGURED = "__unconfigured__";

export type WarehouseMaterialStatusFilter = "all" | "sent" | "unsent";
export type WarehouseMaterialSort =
  | "default"
  | "invoiceDate_desc"
  | "invoiceDate_asc"
  | "name_asc"
  | "quantity_desc";

export type WarehouseMaterialQueryInput = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: WarehouseMaterialStatusFilter;
  configFilter?: string;
  sortBy?: WarehouseMaterialSort;
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
};

export type WarehouseMaterialQueryOptions = WarehouseMaterialQueryInput & {
  siteId: string;
  includeSpendInsights?: boolean;
  recordIdFilter?: {
    include?: string[];
    exclude?: string[];
  };
};

export type WarehouseSpendInsightEntry = {
  key: string;
  label: string;
  totalCost: number;
  count: number;
};

export type WarehouseSpendInsights = {
  supplierTotals: WarehouseSpendInsightEntry[];
  monthlyTotals: WarehouseSpendInsightEntry[];
};

export const warehouseMaterialSelect = {
  id: true,
  name: true,
  quantity: true,
  categoryId: true,
  categoryName: true,
  measurementUnitId: true,
  measurementUnit: true,
  cost: true,
  invoiceNr: true,
  invoiceDate: true,
  materialDate: true,
  supplierName: true,
  importBatchId: true,
  costCode: true,
  sourcePhoto: true,
  declarationAttachment: true,
  agreementAttachment: true,
  BISId: true,
  bisStatus: true,
  createdAt: true,
} satisfies Prisma.BISmaterialRecordsSelect;

export type WarehouseMaterialRow = Prisma.BISmaterialRecordsGetPayload<{
  select: typeof warehouseMaterialSelect;
}>;

type WarehouseMaterialQueryClient = {
  bISmaterialRecords: {
    findMany: (args: Prisma.BISmaterialRecordsFindManyArgs) => Promise<unknown[]>;
    count: (args: Prisma.BISmaterialRecordsCountArgs) => Promise<number>;
    aggregate: (args: Prisma.BISmaterialRecordsAggregateArgs) => Promise<{ _sum: { cost: number | null } }>;
  };
};

type NormalizedWarehouseMaterialQuery = Required<Pick<
  WarehouseMaterialQueryInput,
  "page" | "pageSize" | "search" | "status" | "configFilter" | "sortBy"
>> & Pick<
  WarehouseMaterialQueryInput,
  "invoiceDateFrom" | "invoiceDateTo"
>;

function normalizeDateInput(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
  return trimmed;
}

function toUtcDateBoundary(value: string, boundary: "start" | "end") {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  const date = boundary === "start"
    ? new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    : new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function normalizeWarehouseMaterialQuery(input: WarehouseMaterialQueryInput = {}): NormalizedWarehouseMaterialQuery {
  const requestedPageSize = Number(input.pageSize ?? WAREHOUSE_MATERIAL_PAGE_SIZE);
  const pageSize = WAREHOUSE_MATERIAL_PAGE_SIZE_OPTIONS.includes(
    requestedPageSize as (typeof WAREHOUSE_MATERIAL_PAGE_SIZE_OPTIONS)[number],
  )
    ? requestedPageSize
    : WAREHOUSE_MATERIAL_PAGE_SIZE;
  const page = Math.max(1, Math.floor(Number(input.page ?? 1)) || 1);
  const status = input.status === "sent" || input.status === "unsent" ? input.status : "all";
  const sortBy = [
    "default",
    "invoiceDate_desc",
    "invoiceDate_asc",
    "name_asc",
    "quantity_desc",
  ].includes(input.sortBy ?? "")
    ? input.sortBy as WarehouseMaterialSort
    : "default";

  return {
    page,
    pageSize,
    search: input.search?.trim() ?? "",
    status,
    configFilter: input.configFilter?.trim() || WAREHOUSE_CONFIG_FILTER_ALL,
    sortBy,
    invoiceDateFrom: normalizeDateInput(input.invoiceDateFrom),
    invoiceDateTo: normalizeDateInput(input.invoiceDateTo),
  };
}

export function buildWarehouseMaterialWhere(
  siteId: string,
  input: WarehouseMaterialQueryInput = {},
  options: {
    dateFilteringMode?: "invoiceDate" | "none";
    recordIdFilter?: WarehouseMaterialQueryOptions["recordIdFilter"];
  } = {},
): Prisma.BISmaterialRecordsWhereInput {
  const normalized = normalizeWarehouseMaterialQuery(input);
  const dateFilteringMode = options.dateFilteringMode ?? "invoiceDate";
  const and: Prisma.BISmaterialRecordsWhereInput[] = [{ siteId }];

  if (normalized.search) {
    and.push({
      OR: [
        { name: { contains: normalized.search, mode: "insensitive" } },
        { categoryName: { contains: normalized.search, mode: "insensitive" } },
        { measurementUnit: { contains: normalized.search, mode: "insensitive" } },
        { invoiceNr: { contains: normalized.search, mode: "insensitive" } },
        { supplierName: { contains: normalized.search, mode: "insensitive" } },
        { BISId: { contains: normalized.search, mode: "insensitive" } },
        { bisStatus: { contains: normalized.search, mode: "insensitive" } },
      ],
    });
  }

  if (normalized.status === "sent") {
    and.push({ BISId: { not: null } });
  } else if (normalized.status === "unsent") {
    and.push({ BISId: null });
  }

  if (normalized.configFilter === WAREHOUSE_CONFIG_FILTER_CONFIGURED) {
    and.push({ categoryId: { not: null, notIn: ["", "no_match"] } });
  } else if (normalized.configFilter === WAREHOUSE_CONFIG_FILTER_UNCONFIGURED) {
    and.push({
      OR: [
        { categoryId: null },
        { categoryId: "" },
        { categoryId: "no_match" },
      ],
    });
  } else if (normalized.configFilter !== WAREHOUSE_CONFIG_FILTER_ALL) {
    and.push({ categoryId: normalized.configFilter });
  }

  if (options.recordIdFilter?.include) {
    and.push({ id: { in: options.recordIdFilter.include } });
  }

  if (options.recordIdFilter?.exclude?.length) {
    and.push({ id: { notIn: options.recordIdFilter.exclude } });
  }

  if (dateFilteringMode === "invoiceDate") {
    const invoiceDateFilter: Prisma.DateTimeNullableFilter = {};
    const invoiceDateFrom = normalized.invoiceDateFrom ? toUtcDateBoundary(normalized.invoiceDateFrom, "start") : undefined;
    const invoiceDateTo = normalized.invoiceDateTo ? toUtcDateBoundary(normalized.invoiceDateTo, "end") : undefined;

    if (invoiceDateFrom) invoiceDateFilter.gte = invoiceDateFrom;
    if (invoiceDateTo) invoiceDateFilter.lte = invoiceDateTo;

    if (Object.keys(invoiceDateFilter).length > 0) {
      and.push({ invoiceDate: invoiceDateFilter });
    }
  }

  return and.length === 1 ? and[0] : { AND: and };
}

type WarehouseSpendInsightRow = {
  supplierName: string | null;
  invoiceDate: Date | null;
  createdAt: Date | null;
  importBatchId: string | null;
  sourcePhoto: string | null;
  cost: number | null;
};

function isFutureInvoiceYear(date: Date) {
  return date.getUTCFullYear() > new Date().getUTCFullYear();
}

export function getWarehouseEffectiveSpendDate(row: {
  invoiceDate: Date | null;
  createdAt: Date | null;
  importBatchId: string | null;
  sourcePhoto: string | null;
}) {
  if (row.importBatchId) return row.invoiceDate ?? row.createdAt;
  if (row.sourcePhoto) {
    return row.invoiceDate && !isFutureInvoiceYear(row.invoiceDate)
      ? row.invoiceDate
      : row.createdAt;
  }
  return row.invoiceDate ?? row.createdAt;
}

function isWithinEffectiveSpendDateRange(
  row: WarehouseSpendInsightRow,
  input: NormalizedWarehouseMaterialQuery,
) {
  const from = input.invoiceDateFrom ? toUtcDateBoundary(input.invoiceDateFrom, "start") : undefined;
  const to = input.invoiceDateTo ? toUtcDateBoundary(input.invoiceDateTo, "end") : undefined;
  if (!from && !to) return true;

  const effectiveDate = getWarehouseEffectiveSpendDate(row);
  if (!effectiveDate) return false;

  if (from && effectiveDate < from) return false;
  if (to && effectiveDate > to) return false;
  return true;
}

function buildSpendInsights(rows: WarehouseSpendInsightRow[]): WarehouseSpendInsights {
  const supplierMap = new Map<string, WarehouseSpendInsightEntry>();
  const monthMap = new Map<string, WarehouseSpendInsightEntry>();

  for (const row of rows) {
    if (typeof row.cost !== "number" || Number.isNaN(row.cost)) continue;

    const supplierLabel = row.supplierName?.trim() || "";
    const supplierKey = supplierLabel.toLowerCase() || "__no_supplier__";
    const supplierEntry = supplierMap.get(supplierKey) ?? {
      key: supplierKey,
      label: supplierLabel,
      totalCost: 0,
      count: 0,
    };
    supplierEntry.totalCost += row.cost;
    supplierEntry.count += 1;
    supplierMap.set(supplierKey, supplierEntry);

    const effectiveDate = getWarehouseEffectiveSpendDate(row);
    if (effectiveDate) {
      const monthKey = effectiveDate.toISOString().slice(0, 7);
      const monthEntry = monthMap.get(monthKey) ?? {
        key: monthKey,
        label: monthKey,
        totalCost: 0,
        count: 0,
      };
      monthEntry.totalCost += row.cost;
      monthEntry.count += 1;
      monthMap.set(monthKey, monthEntry);
    }
  }

  const byCostDesc = (a: WarehouseSpendInsightEntry, b: WarehouseSpendInsightEntry) =>
    b.totalCost - a.totalCost || a.label.localeCompare(b.label);

  return {
    supplierTotals: Array.from(supplierMap.values()).sort(byCostDesc),
    monthlyTotals: Array.from(monthMap.values()).sort((a, b) => b.key.localeCompare(a.key)),
  };
}

function getSortDateValue(value: Date | null) {
  return value?.getTime() ?? null;
}

function compareNullableDesc(a: number | string | null, b: number | string | null) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a < b ? 1 : a > b ? -1 : 0;
}

function compareNullableAsc(a: number | string | null, b: number | string | null) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortWarehouseRows(rows: WarehouseMaterialRow[], sortBy: WarehouseMaterialSort) {
  return [...rows].sort((a, b) => {
    switch (sortBy) {
      case "invoiceDate_asc":
        return compareNullableAsc(getSortDateValue(a.invoiceDate), getSortDateValue(b.invoiceDate)) || a.id.localeCompare(b.id);
      case "invoiceDate_desc":
        return compareNullableDesc(getSortDateValue(a.invoiceDate), getSortDateValue(b.invoiceDate)) || b.id.localeCompare(a.id);
      case "name_asc":
        return compareNullableAsc(a.name?.toLowerCase() ?? null, b.name?.toLowerCase() ?? null) || a.id.localeCompare(b.id);
      case "quantity_desc":
        return compareNullableDesc(a.quantity, b.quantity) || b.id.localeCompare(a.id);
      case "default":
      default:
        return (
          compareNullableDesc(getSortDateValue(a.materialDate), getSortDateValue(b.materialDate)) ||
          compareNullableDesc(getSortDateValue(a.invoiceDate), getSortDateValue(b.invoiceDate)) ||
          b.id.localeCompare(a.id)
        );
    }
  });
}

export function buildWarehouseMaterialOrderBy(
  sortBy: WarehouseMaterialSort = "default",
): Prisma.BISmaterialRecordsOrderByWithRelationInput[] {
  switch (sortBy) {
    case "invoiceDate_asc":
      return [{ invoiceDate: { sort: "asc", nulls: "last" } }, { id: "asc" }];
    case "name_asc":
      return [{ name: { sort: "asc", nulls: "last" } }, { id: "asc" }];
    case "quantity_desc":
      return [{ quantity: { sort: "desc", nulls: "last" } }, { id: "desc" }];
    case "invoiceDate_desc":
      return [{ invoiceDate: { sort: "desc", nulls: "last" } }, { id: "desc" }];
    case "default":
    default:
      return [
        { materialDate: { sort: "desc", nulls: "last" } },
        { invoiceDate: { sort: "desc", nulls: "last" } },
        { id: "desc" },
      ];
  }
}

export async function getWarehouseMaterialPage(
  options: WarehouseMaterialQueryOptions,
  client: WarehouseMaterialQueryClient = prisma as unknown as WarehouseMaterialQueryClient,
) {
  const normalized = normalizeWarehouseMaterialQuery(options);
  const useEffectiveSpendDate = Boolean(options.includeSpendInsights);
  const where = buildWarehouseMaterialWhere(options.siteId, normalized, {
    dateFilteringMode: useEffectiveSpendDate ? "none" : "invoiceDate",
    recordIdFilter: options.recordIdFilter,
  });
  const orderBy = buildWarehouseMaterialOrderBy(normalized.sortBy);

  if (useEffectiveSpendDate) {
    const candidateRows = await client.bISmaterialRecords.findMany({
      where,
      select: warehouseMaterialSelect,
    }) as WarehouseMaterialRow[];
    const filteredRows = sortWarehouseRows(
      candidateRows.filter((row) => isWithinEffectiveSpendDateRange(row, normalized)),
      normalized.sortBy,
    );
    const totalCount = filteredRows.length;
    const totalCost = filteredRows.reduce((sum, row) => (
      typeof row.cost === "number" && !Number.isNaN(row.cost) ? sum + row.cost : sum
    ), 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / normalized.pageSize));
    const page = Math.min(normalized.page, totalPages);
    const skip = (page - 1) * normalized.pageSize;

    return {
      rows: filteredRows.slice(skip, skip + normalized.pageSize),
      totalCount,
      totalCost,
      page,
      pageSize: normalized.pageSize,
      totalPages,
      spendInsights: buildSpendInsights(filteredRows),
    };
  }

  const [totalCount, aggregate, spendRows] = await Promise.all([
    client.bISmaterialRecords.count({ where }),
    client.bISmaterialRecords.aggregate({
      where,
      _sum: { cost: true },
    }),
    options.includeSpendInsights
      ? client.bISmaterialRecords.findMany({
        where,
        select: {
          supplierName: true,
          invoiceDate: true,
          createdAt: true,
          importBatchId: true,
          sourcePhoto: true,
          cost: true,
        },
      })
      : Promise.resolve([]),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / normalized.pageSize));
  const page = Math.min(normalized.page, totalPages);
  const skip = (page - 1) * normalized.pageSize;
  const rows = await client.bISmaterialRecords.findMany({
    where,
    orderBy,
    skip,
    take: normalized.pageSize,
    select: warehouseMaterialSelect,
  }) as WarehouseMaterialRow[];

  return {
    rows,
    totalCount,
    totalCost: aggregate._sum.cost ?? 0,
    page,
    pageSize: normalized.pageSize,
    totalPages,
    spendInsights: options.includeSpendInsights
      ? buildSpendInsights(spendRows as WarehouseSpendInsightRow[])
      : undefined,
  };
}

export async function getWarehouseMaterialExportRows(
  options: WarehouseMaterialQueryOptions,
  client: WarehouseMaterialQueryClient = prisma as unknown as WarehouseMaterialQueryClient,
) {
  const normalized = normalizeWarehouseMaterialQuery(options);
  const where = buildWarehouseMaterialWhere(options.siteId, normalized, {
    dateFilteringMode: options.includeSpendInsights ? "none" : "invoiceDate",
    recordIdFilter: options.recordIdFilter,
  });
  const orderBy = buildWarehouseMaterialOrderBy(normalized.sortBy);

  if (options.includeSpendInsights) {
    const rows = await client.bISmaterialRecords.findMany({
      where,
      select: warehouseMaterialSelect,
    }) as WarehouseMaterialRow[];

    return sortWarehouseRows(
      rows.filter((row) => isWithinEffectiveSpendDateRange(row, normalized)),
      normalized.sortBy,
    );
  }

  return client.bISmaterialRecords.findMany({
    where,
    orderBy,
    select: warehouseMaterialSelect,
  }) as Promise<WarehouseMaterialRow[]>;
}
