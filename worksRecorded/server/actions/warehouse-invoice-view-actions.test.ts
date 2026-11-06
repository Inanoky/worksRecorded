jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("@/server/actions/shared-actions", () => ({ orgCheck: jest.fn() }));

const materialFindMany = jest.fn();

jest.mock("@/lib/utils/db", () => ({
  prisma: {
    bISmaterialRecords: {
      findMany: (...args: unknown[]) => materialFindMany(...args),
    },
  },
}));

import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import {
  fetchWarehouseInvoiceRows,
  groupWarehouseInvoiceRows,
} from "./warehouse-invoice-view-actions";

const baseRow = {
  id: "row-1",
  invoiceNr: "INV-1",
  supplierName: "Supplier",
  invoiceDate: new Date("2026-11-01T00:00:00.000Z"),
  createdAt: new Date("2026-11-02T00:00:00.000Z"),
  sourcePhoto: "https://example.com/invoice.pdf",
  importBatchId: "batch-1",
  cost: 10,
  BISId: null,
};

describe("warehouse invoice view", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(requireUser).mockResolvedValue({ id: "user-1" } as Awaited<
      ReturnType<typeof requireUser>
    >);
    jest.mocked(orgCheck).mockResolvedValue({
      id: "site-1",
      name: "Site",
      organizationId: "org-1",
    });
  });

  it("groups every row from the same import into one invoice summary", () => {
    expect(
      groupWarehouseInvoiceRows([
        baseRow,
        {
          ...baseRow,
          id: "row-2",
          cost: 25,
          BISId: "bis-2",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        key: "batch:batch-1",
        locator: { type: "batch", value: "batch-1" },
        invoiceNumber: "INV-1",
        itemCount: 2,
        totalCost: 35,
        sentCount: 1,
      }),
    ]);
  });

  it("keeps repeated invoice numbers separate when supplier or date differs", () => {
    const summaries = groupWarehouseInvoiceRows([
      { ...baseRow, sourcePhoto: null, importBatchId: null },
      {
        ...baseRow,
        id: "row-2",
        supplierName: "Another supplier",
        sourcePhoto: null,
        importBatchId: null,
      },
    ]);

    expect(summaries).toHaveLength(2);
    expect(summaries.map((summary) => summary.supplierName)).toEqual(
      expect.arrayContaining(["Supplier", "Another supplier"]),
    );
  });

  it("fetches invoice rows only from the accessible project and selected group", async () => {
    materialFindMany.mockResolvedValue([]);

    await fetchWarehouseInvoiceRows("site-1", {
      type: "batch",
      value: "batch-1",
    });

    expect(materialFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { siteId: "site-1", importBatchId: "batch-1" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    );
  });
});
