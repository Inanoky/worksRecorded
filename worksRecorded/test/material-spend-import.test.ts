import {
  buildMaterialSpendImportCreateData,
  cleanSupplierName,
  parseEurCost,
  parseLatvianInvoiceDate,
  validateMaterialSpendImportRows,
} from "@/lib/bis/material-spend-import";

describe("material spend import", () => {
  it("cleans supplier names deterministically", () => {
    expect(cleanSupplierName("  REMONTDARBI,  ")).toBe("REMONTDARBI");
    expect(cleanSupplierName("A   B")).toBe("A B");
    expect(cleanSupplierName("")).toBeNull();
  });

  it("parses DD.MM.YYYY invoice dates", () => {
    expect(parseLatvianInvoiceDate("03.07.2026")?.toISOString()).toBe("2026-07-03T00:00:00.000Z");
    expect(parseLatvianInvoiceDate("2026-07-03")).toBeNull();
    expect(parseLatvianInvoiceDate("31.02.2026")).toBeNull();
  });

  it("parses EUR costs with spaces and comma decimals", () => {
    expect(parseEurCost("1 006.14")).toBe(1006.14);
    expect(parseEurCost("1 006,14")).toBe(1006.14);
    expect(parseEurCost("abc")).toBeNull();
  });

  it("validates spend rows and preserves repeated invoices", () => {
    const validation = validateMaterialSpendImportRows([
      {
        "Rekina Datums": "01.07.2026",
        "Rēķina NR": "INV-1",
        "PiegādātajsSIA": " Supplier, ",
        "Apgrozījums /Izmaksas (EUR)": "10.50",
      },
      {
        "Rekina Datums": "02.07.2026",
        "Rēķina NR": "INV-1",
        "PiegādātajsSIA": "",
        "Apgrozījums /Izmaksas (EUR)": "20",
      },
    ]);

    expect(validation.ok).toBe(true);
    expect(validation.excelRowCount).toBe(2);
    expect(validation.parsedRowCount).toBe(2);
    expect(validation.emptySupplierRows).toEqual([3]);
    expect(validation.rows.map((row) => row.invoiceNr)).toEqual(["INV-1", "INV-1"]);
    expect(validation.rows[0]).toMatchObject({
      supplierName: "Supplier",
      cost: 10.5,
    });
  });

  it("rejects invalid dates and costs", () => {
    const validation = validateMaterialSpendImportRows([
      {
        "Rekina Datums": "2026-07-01",
        "Rēķina NR": "INV-1",
        "PiegādātajsSIA": "Supplier",
        "Apgrozījums /Izmaksas (EUR)": "nope",
      },
    ]);

    expect(validation.ok).toBe(false);
    expect(validation.errors).toEqual([
      "Row 2: Rekina Datums must be DD.MM.YYYY; got \"2026-07-01\".",
      "Row 2: Apgrozījums /Izmaksas (EUR) must be numeric; got \"nope\".",
    ]);
  });

  it("skips rows with blank cost cells", () => {
    const validation = validateMaterialSpendImportRows([
      {
        "Rekina Datums": "01.07.2026",
        "Rēķina NR": "INV-1",
        "PiegādātajsSIA": "Supplier",
        "Apgrozījums /Izmaksas (EUR)": "",
      },
      {
        "Rekina Datums": "02.07.2026",
        "Rēķina NR": "INV-2",
        "PiegādātajsSIA": "Supplier",
        "Apgrozījums /Izmaksas (EUR)": "12.50",
      },
    ]);

    expect(validation.ok).toBe(true);
    expect(validation.skippedEmptyCostRows).toEqual([2]);
    expect(validation.rows.map((row) => row.invoiceNr)).toEqual(["INV-2"]);
  });

  it("skips fully empty trailing rows", () => {
    const validation = validateMaterialSpendImportRows([
      {
        "Rekina Datums": "01.07.2026",
        "Rēķina NR": "INV-1",
        "PiegādātajsSIA": "Supplier",
        "Apgrozījums /Izmaksas (EUR)": "10.50",
      },
      {
        "Rekina Datums": "",
        "Rēķina NR": "",
        "PiegādātajsSIA": "",
        "Apgrozījums /Izmaksas (EUR)": "",
      },
    ]);

    expect(validation.ok).toBe(true);
    expect(validation.excelRowCount).toBe(2);
    expect(validation.parsedRowCount).toBe(1);
    expect(validation.rows).toHaveLength(1);
  });

  it("builds display-only material spend rows without BIS classification fields", () => {
    const invoiceDate = new Date("2026-07-01T00:00:00.000Z");
    const data = buildMaterialSpendImportCreateData({
      organizationId: "org-1",
      siteId: "site-1",
      userId: "user-1",
      importBatchId: "batch-1",
      rows: [{
        invoiceDate,
        invoiceNr: "INV-1",
        supplierName: "Supplier",
        cost: 100,
      }],
    });

    expect(data).toEqual([expect.objectContaining({
      invoiceDate,
      invoiceNr: "INV-1",
      supplierName: "Supplier",
      cost: 100,
      importBatchId: "batch-1",
      siteId: "site-1",
      orgId: "org-1",
      userId: "user-1",
      categoryId: null,
      categoryName: null,
      measurementUnitId: null,
      measurementUnit: null,
      BISId: null,
      bisStatus: null,
    })]);
  });
});
