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
  | "sourcePhoto_asc"
  | "sourcePhoto_desc"
  | "name_desc"
  | "supplierName_asc"
  | "supplierName_desc"
  | "status_asc"
  | "status_desc"
  | "categoryName_asc"
  | "categoryName_desc"
  | "materialDate_asc"
  | "materialDate_desc"
  | "quantity_asc"
  | "measurementUnit_asc"
  | "measurementUnit_desc"
  | "cost_asc"
  | "cost_desc"
  | "invoiceNr_asc"
  | "invoiceNr_desc"
  | "invoiceDate_desc"
  | "invoiceDate_asc"
  | "name_asc"
  | "quantity_desc"
  | "createdAt_asc"
  | "createdAt_desc";

export const WAREHOUSE_MATERIAL_SORTS: readonly WarehouseMaterialSort[] = [
  "default",
  "sourcePhoto_asc",
  "sourcePhoto_desc",
  "name_asc",
  "name_desc",
  "supplierName_asc",
  "supplierName_desc",
  "status_asc",
  "status_desc",
  "categoryName_asc",
  "categoryName_desc",
  "materialDate_asc",
  "materialDate_desc",
  "quantity_asc",
  "quantity_desc",
  "measurementUnit_asc",
  "measurementUnit_desc",
  "cost_asc",
  "cost_desc",
  "invoiceNr_asc",
  "invoiceNr_desc",
  "invoiceDate_asc",
  "invoiceDate_desc",
  "createdAt_asc",
  "createdAt_desc",
];

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
  const sortBy = WAREHOUSE_MATERIAL_SORTS.includes(input.sortBy as WarehouseMaterialSort)
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

function compareNullableAscNullsFirst(a: number | string | null, b: number | string | null) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortWarehouseRows(rows: WarehouseMaterialRow[], sortBy: WarehouseMaterialSort) {
  return [...rows].sort((a, b) => {
    switch (sortBy) {
      case "sourcePhoto_asc":
        return compareNullableAsc(a.sourcePhoto?.toLowerCase() ?? null, b.sourcePhoto?.toLowerCase() ?? null) || a.id.localeCompare(b.id);
      case "sourcePhoto_desc":
        return compareNullableDesc(a.sourcePhoto?.toLowerCase() ?? null, b.sourcePhoto?.toLowerCase() ?? null) || b.id.localeCompare(a.id);
      case "name_desc":
        return compareNullableDesc(a.name?.toLowerCase() ?? null, b.name?.toLowerCase() ?? null) || b.id.localeCompare(a.id);
      case "supplierName_asc":
        return compareNullableAsc(a.supplierName?.toLowerCase() ?? null, b.supplierName?.toLowerCase() ?? null) || a.id.localeCompare(b.id);
      case "supplierName_desc":
        return compareNullableDesc(a.supplierName?.toLowerCase() ?? null, b.supplierName?.toLowerCase() ?? null) || b.id.localeCompare(a.id);
      case "status_asc":
        return compareNullableAsc(a.bisStatus?.toLowerCase() ?? (a.BISId ? "sent" : null), b.bisStatus?.toLowerCase() ?? (b.BISId ? "sent" : null)) || a.id.localeCompare(b.id);
      case "status_desc":
        return compareNullableDesc(a.bisStatus?.toLowerCase() ?? (a.BISId ? "sent" : null), b.bisStatus?.toLowerCase() ?? (b.BISId ? "sent" : null)) || b.id.localeCompare(a.id);
      case "categoryName_asc":
        return compareNullableAsc(a.categoryName?.toLowerCase() ?? null, b.categoryName?.toLowerCase() ?? null) || a.id.localeCompare(b.id);
      case "categoryName_desc":
        return compareNullableDesc(a.categoryName?.toLowerCase() ?? null, b.categoryName?.toLowerCase() ?? null) || b.id.localeCompare(a.id);
      case "materialDate_asc":
        return compareNullableAscNullsFirst(getSortDateValue(a.materialDate), getSortDateValue(b.materialDate)) || a.id.localeCompare(b.id);
      case "materialDate_desc":
        return compareNullableDesc(getSortDateValue(a.materialDate), getSortDateValue(b.materialDate)) || b.id.localeCompare(a.id);
      case "quantity_asc":
        return compareNullableAsc(a.quantity, b.quantity) || a.id.localeCompare(b.id);
      case "measurementUnit_asc":
        return compareNullableAsc(a.measurementUnit?.toLowerCase() ?? null, b.measurementUnit?.toLowerCase() ?? null) || a.id.localeCompare(b.id);
      case "measurementUnit_desc":
        return compareNullableDesc(a.measurementUnit?.toLowerCase() ?? null, b.measurementUnit?.toLowerCase() ?? null) || b.id.localeCompare(a.id);
      case "cost_asc":
        return compareNullableAsc(a.cost, b.cost) || a.id.localeCompare(b.id);
      case "cost_desc":
        return compareNullableDesc(a.cost, b.cost) || b.id.localeCompare(a.id);
      case "invoiceNr_asc":
        return compareNullableAsc(a.invoiceNr?.toLowerCase() ?? null, b.invoiceNr?.toLowerCase() ?? null) || a.id.localeCompare(b.id);
      case "invoiceNr_desc":
        return compareNullableDesc(a.invoiceNr?.toLowerCase() ?? null, b.invoiceNr?.toLowerCase() ?? null) || b.id.localeCompare(a.id);
      case "invoiceDate_asc":
        return compareNullableAscNullsFirst(getSortDateValue(a.invoiceDate), getSortDateValue(b.invoiceDate)) || a.id.localeCompare(b.id);
      case "invoiceDate_desc":
        return compareNullableDesc(getSortDateValue(a.invoiceDate), getSortDateValue(b.invoiceDate)) || b.id.localeCompare(a.id);
      case "name_asc":
        return compareNullableAsc(a.name?.toLowerCase() ?? null, b.name?.toLowerCase() ?? null) || a.id.localeCompare(b.id);
      case "quantity_desc":
        return compareNullableDesc(a.quantity, b.quantity) || b.id.localeCompare(a.id);
      case "createdAt_asc":
        return compareNullableAsc(a.createdAt.getTime(), b.createdAt.getTime()) || a.id.localeCompare(b.id);
      case "createdAt_desc":
        return compareNullableDesc(a.createdAt.getTime(), b.createdAt.getTime()) || b.id.localeCompare(a.id);
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
    case "sourcePhoto_asc":
      return [{ sourcePhoto: { sort: "asc", nulls: "last" } }, { id: "asc" }];
    case "sourcePhoto_desc":
      return [{ sourcePhoto: { sort: "desc", nulls: "last" } }, { id: "desc" }];
    case "invoiceDate_asc":
      return [{ invoiceDate: { sort: "asc", nulls: "first" } }, { id: "asc" }];
    case "name_asc":
      return [{ name: { sort: "asc", nulls: "last" } }, { id: "asc" }];
    case "name_desc":
      return [{ name: { sort: "desc", nulls: "last" } }, { id: "desc" }];
    case "supplierName_asc":
      return [{ supplierName: { sort: "asc", nulls: "last" } }, { id: "asc" }];
    case "supplierName_desc":
      return [{ supplierName: { sort: "desc", nulls: "last" } }, { id: "desc" }];
    case "status_asc":
      return [{ bisStatus: { sort: "asc", nulls: "last" } }, { BISId: { sort: "asc", nulls: "last" } }, { id: "asc" }];
    case "status_desc":
      return [{ bisStatus: { sort: "desc", nulls: "last" } }, { BISId: { sort: "desc", nulls: "last" } }, { id: "desc" }];
    case "categoryName_asc":
      return [{ categoryName: { sort: "asc", nulls: "last" } }, { id: "asc" }];
    case "categoryName_desc":
      return [{ categoryName: { sort: "desc", nulls: "last" } }, { id: "desc" }];
    case "materialDate_asc":
      return [{ materialDate: { sort: "asc", nulls: "first" } }, { id: "asc" }];
    case "materialDate_desc":
      return [{ materialDate: { sort: "desc", nulls: "last" } }, { id: "desc" }];
    case "quantity_asc":
      return [{ quantity: { sort: "asc", nulls: "last" } }, { id: "asc" }];
    case "quantity_desc":
      return [{ quantity: { sort: "desc", nulls: "last" } }, { id: "desc" }];
    case "measurementUnit_asc":
      return [{ measurementUnit: { sort: "asc", nulls: "last" } }, { id: "asc" }];
    case "measurementUnit_desc":
      return [{ measurementUnit: { sort: "desc", nulls: "last" } }, { id: "desc" }];
    case "cost_asc":
      return [{ cost: { sort: "asc", nulls: "last" } }, { id: "asc" }];
    case "cost_desc":
      return [{ cost: { sort: "desc", nulls: "last" } }, { id: "desc" }];
    case "invoiceNr_asc":
      return [{ invoiceNr: { sort: "asc", nulls: "last" } }, { id: "asc" }];
    case "invoiceNr_desc":
      return [{ invoiceNr: { sort: "desc", nulls: "last" } }, { id: "desc" }];
    case "invoiceDate_desc":
      return [{ invoiceDate: { sort: "desc", nulls: "last" } }, { id: "desc" }];
    case "createdAt_asc":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "createdAt_desc":
      return [{ createdAt: "desc" }, { id: "desc" }];
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
