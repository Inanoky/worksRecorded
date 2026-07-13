import {
  buildWarehouseMaterialOrderBy,
  buildWarehouseMaterialWhere,
  getWarehouseEffectiveSpendDate,
  getWarehouseMaterialExportRows,
  getWarehouseMaterialPage,
  normalizeWarehouseMaterialQuery,
} from "@/lib/bis/warehouse-material-query";
import {
  canShowWarehouseSpendInsights,
  parseWarehouseSpendOrganizationIds,
} from "@/lib/bis/warehouse-spend-visibility";

function createMockClient(rows: any[] = [
  {
    id: "row-1",
    name: "Betons",
    quantity: null,
    categoryId: null,
    categoryName: null,
    measurementUnitId: null,
    measurementUnit: null,
    cost: 25,
    invoiceNr: "INV-1",
    invoiceDate: new Date("2026-07-01T00:00:00.000Z"),
    materialDate: null,
    supplierName: "Supplier",
    importBatchId: "batch-1",
    costCode: null,
    sourcePhoto: null,
    declarationAttachment: [],
    agreementAttachment: [],
    BISId: null,
    bisStatus: null,
    createdAt: new Date("2026-07-13T00:00:00.000Z"),
  },
]) {
  return {
    bISmaterialRecords: {
      findMany: jest.fn().mockResolvedValue(rows),
      count: jest.fn().mockResolvedValue(125),
      aggregate: jest.fn().mockResolvedValue({ _sum: { cost: 1234.56 } }),
    },
  };
}

describe("warehouse material query", () => {
  it("normalizes pagination, filters, and sort defaults", () => {
    expect(normalizeWarehouseMaterialQuery({
      page: -2,
      pageSize: 999,
      search: "  abc  ",
      status: "sent",
      configFilter: "",
      sortBy: "name_asc",
    })).toEqual({
      page: 1,
      pageSize: 50,
      search: "abc",
      status: "sent",
      configFilter: "all",
      sortBy: "name_asc",
      invoiceDateFrom: undefined,
      invoiceDateTo: undefined,
    });
  });

  it("builds search where clauses for material, invoice, and supplier", () => {
    const where = buildWarehouseMaterialWhere("site-1", {
      search: "remont",
      status: "unsent",
      configFilter: "config-1",
    });

    expect(where).toMatchObject({
      AND: [
        { siteId: "site-1" },
        {
          OR: expect.arrayContaining([
            { name: { contains: "remont", mode: "insensitive" } },
            { invoiceNr: { contains: "remont", mode: "insensitive" } },
            { supplierName: { contains: "remont", mode: "insensitive" } },
          ]),
        },
        { BISId: null },
        { categoryId: "config-1" },
      ],
    });
  });

  it("builds status and config filters", () => {
    expect(buildWarehouseMaterialWhere("site-1", { status: "sent" })).toEqual({
      AND: [{ siteId: "site-1" }, { BISId: { not: null } }],
    });

    expect(buildWarehouseMaterialWhere("site-1", { configFilter: "config-1" })).toEqual({
      AND: [{ siteId: "site-1" }, { categoryId: "config-1" }],
    });
  });

  it("builds invoice date range filters and excludes no-date rows when active", () => {
    const where = buildWarehouseMaterialWhere("site-1", {
      invoiceDateFrom: "2026-07-01",
      invoiceDateTo: "2026-07-31",
    });

    expect(where).toMatchObject({
      AND: [
        { siteId: "site-1" },
        {
          invoiceDate: {
            gte: new Date("2026-07-01T00:00:00.000Z"),
            lte: new Date("2026-07-31T23:59:59.999Z"),
          },
        },
      ],
    });

    expect(buildWarehouseMaterialWhere("site-1", {})).toEqual({ siteId: "site-1" });
  });

  it("can skip DB invoice date filtering for effective spend date queries", () => {
    expect(buildWarehouseMaterialWhere("site-1", {
      invoiceDateFrom: "2026-07-01",
      invoiceDateTo: "2026-07-31",
    }, { dateFilteringMode: "none" })).toEqual({ siteId: "site-1" });
  });

  it("maps sort options to Prisma orderBy", () => {
    expect(buildWarehouseMaterialOrderBy("default")).toEqual([
      { materialDate: { sort: "desc", nulls: "last" } },
      { invoiceDate: { sort: "desc", nulls: "last" } },
      { id: "desc" },
    ]);
    expect(buildWarehouseMaterialOrderBy("invoiceDate_asc")).toEqual([
      { invoiceDate: { sort: "asc", nulls: "last" } },
      { id: "asc" },
    ]);
    expect(buildWarehouseMaterialOrderBy("quantity_desc")).toEqual([
      { quantity: { sort: "desc", nulls: "last" } },
      { id: "desc" },
    ]);
  });

  it("returns paged rows with all-filtered count and total cost", async () => {
    const client = createMockClient();
    const result = await getWarehouseMaterialPage({
      siteId: "site-1",
      page: 2,
      pageSize: 50,
      search: "supplier",
      sortBy: "invoiceDate_desc",
    }, client);

    expect(client.bISmaterialRecords.count).toHaveBeenCalledWith({
      where: expect.any(Object),
    });
    expect(client.bISmaterialRecords.aggregate).toHaveBeenCalledWith({
      where: expect.any(Object),
      _sum: { cost: true },
    });
    expect(client.bISmaterialRecords.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 50,
      take: 50,
    }));
    expect(result).toMatchObject({
      totalCount: 125,
      totalCost: 1234.56,
      page: 2,
      pageSize: 50,
      totalPages: 3,
    });
  });

  it("returns spend insights grouped by supplier and invoice month", async () => {
    const client = createMockClient([
      {
        id: "row-1",
        name: null,
        quantity: null,
        categoryId: null,
        categoryName: null,
        measurementUnitId: null,
        measurementUnit: null,
        cost: 100,
        invoiceNr: "INV-1",
        invoiceDate: new Date("2026-07-01T00:00:00.000Z"),
        materialDate: null,
        supplierName: "Supplier A",
        importBatchId: "batch-1",
        costCode: null,
        sourcePhoto: null,
        declarationAttachment: [],
        agreementAttachment: [],
        BISId: null,
        bisStatus: null,
        createdAt: new Date("2026-07-20T00:00:00.000Z"),
      },
      {
        id: "row-2",
        name: null,
        quantity: null,
        categoryId: null,
        categoryName: null,
        measurementUnitId: null,
        measurementUnit: null,
        cost: 40,
        invoiceNr: "INV-2",
        invoiceDate: new Date("2026-07-15T00:00:00.000Z"),
        materialDate: null,
        supplierName: "",
        importBatchId: "batch-1",
        costCode: null,
        sourcePhoto: null,
        declarationAttachment: [],
        agreementAttachment: [],
        BISId: null,
        bisStatus: null,
        createdAt: new Date("2026-07-21T00:00:00.000Z"),
      },
      {
        id: "row-3",
        name: null,
        quantity: null,
        categoryId: null,
        categoryName: null,
        measurementUnitId: null,
        measurementUnit: null,
        cost: 60,
        invoiceNr: "INV-3",
        invoiceDate: new Date("2026-08-01T00:00:00.000Z"),
        materialDate: null,
        supplierName: "Supplier A",
        importBatchId: null,
        costCode: null,
        sourcePhoto: null,
        declarationAttachment: [],
        agreementAttachment: [],
        BISId: null,
        bisStatus: null,
        createdAt: new Date("2026-08-20T00:00:00.000Z"),
      },
    ]);

    const result = await getWarehouseMaterialPage({
      siteId: "site-1",
      includeSpendInsights: true,
    }, client);

    expect(client.bISmaterialRecords.findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        supplierName: true,
        invoiceDate: true,
        createdAt: true,
        importBatchId: true,
        sourcePhoto: true,
        cost: true,
      }),
    }));
    expect(result.spendInsights?.supplierTotals).toEqual([
      { key: "supplier a", label: "Supplier A", totalCost: 160, count: 2 },
      { key: "__no_supplier__", label: "", totalCost: 40, count: 1 },
    ]);
    expect(result.spendInsights?.monthlyTotals).toEqual([
      { key: "2026-08", label: "2026-08", totalCost: 60, count: 1 },
      { key: "2026-07", label: "2026-07", totalCost: 140, count: 2 },
    ]);
  });

  it("uses effective spend dates for photo rows and range-filtered analytics", async () => {
    const client = createMockClient([
      {
        id: "imported-row",
        name: null,
        quantity: null,
        categoryId: null,
        categoryName: null,
        measurementUnitId: null,
        measurementUnit: null,
        cost: 100,
        invoiceNr: "INV-1",
        invoiceDate: new Date("2026-07-05T00:00:00.000Z"),
        materialDate: null,
        supplierName: "Imported Supplier",
        importBatchId: "batch-1",
        costCode: null,
        sourcePhoto: null,
        declarationAttachment: [],
        agreementAttachment: [],
        BISId: null,
        bisStatus: null,
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
      },
      {
        id: "photo-row",
        name: null,
        quantity: null,
        categoryId: null,
        categoryName: null,
        measurementUnitId: null,
        measurementUnit: null,
        cost: 70,
        invoiceNr: "INV-2",
        invoiceDate: new Date("2025-01-01T00:00:00.000Z"),
        materialDate: null,
        supplierName: "Photo Supplier",
        importBatchId: null,
        costCode: null,
        sourcePhoto: "https://example.com/photo.jpg",
        declarationAttachment: [],
        agreementAttachment: [],
        BISId: null,
        bisStatus: null,
        createdAt: new Date("2026-07-18T00:00:00.000Z"),
      },
      {
        id: "fallback-row",
        name: null,
        quantity: null,
        categoryId: null,
        categoryName: null,
        measurementUnitId: null,
        measurementUnit: null,
        cost: 40,
        invoiceNr: "INV-3",
        invoiceDate: null,
        materialDate: null,
        supplierName: "Fallback Supplier",
        importBatchId: null,
        costCode: null,
        sourcePhoto: null,
        declarationAttachment: [],
        agreementAttachment: [],
        BISId: null,
        bisStatus: null,
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    ]);

    const result = await getWarehouseMaterialPage({
      siteId: "site-1",
      includeSpendInsights: true,
      invoiceDateFrom: "2026-07-01",
      invoiceDateTo: "2026-07-31",
    }, client);

    expect(result.rows.map((row) => row.id).sort()).toEqual(["imported-row", "photo-row"]);
    expect(result.totalCount).toBe(2);
    expect(result.totalCost).toBe(170);
    expect(result.spendInsights?.monthlyTotals).toEqual([
      { key: "2026-07", label: "2026-07", totalCost: 170, count: 2 },
    ]);
  });

  it("resolves effective spend dates by import, photo, and fallback rules", () => {
    expect(getWarehouseEffectiveSpendDate({
      importBatchId: "batch-1",
      sourcePhoto: null,
      invoiceDate: new Date("2026-07-01T00:00:00.000Z"),
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
    })?.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(getWarehouseEffectiveSpendDate({
      importBatchId: null,
      sourcePhoto: "photo",
      invoiceDate: new Date("2025-01-01T00:00:00.000Z"),
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
    })?.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(getWarehouseEffectiveSpendDate({
      importBatchId: null,
      sourcePhoto: null,
      invoiceDate: null,
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
    })?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("export query fetches all filtered rows without pagination", async () => {
    const client = createMockClient();
    await getWarehouseMaterialExportRows({
      siteId: "site-1",
      page: 3,
      pageSize: 50,
      search: "comment",
    }, client);

    expect(client.bISmaterialRecords.findMany).toHaveBeenCalledWith(expect.not.objectContaining({
      skip: expect.any(Number),
      take: expect.any(Number),
    }));
  });
});

describe("warehouse spend visibility", () => {
  it("parses comma-separated organization IDs", () => {
    expect(parseWarehouseSpendOrganizationIds(" org-1,org-2 ,, ").has("org-1")).toBe(true);
    expect(parseWarehouseSpendOrganizationIds(" org-1,org-2 ,, ").has("org-2")).toBe(true);
  });

  it("only enables spend insights for configured site manager organizations", () => {
    const configuredOrganizationIds = new Set(["org-1"]);

    expect(canShowWarehouseSpendInsights({
      siteOrganizationId: "org-1",
      userRole: "site manager",
      configuredOrganizationIds,
    })).toBe(true);
    expect(canShowWarehouseSpendInsights({
      siteOrganizationId: "org-1",
      userRole: "project manager",
      configuredOrganizationIds,
    })).toBe(false);
    expect(canShowWarehouseSpendInsights({
      siteOrganizationId: "org-2",
      userRole: "site manager",
      configuredOrganizationIds,
    })).toBe(false);
  });
});
