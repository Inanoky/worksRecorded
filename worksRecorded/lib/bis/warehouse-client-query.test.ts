import {
	buildClientWarehouseSpendInsights,
	type ClientWarehouseMaterialRow,
	queryClientWarehouseMaterials,
} from "./warehouse-client-query";
import {
	buildClientWarehouseInvoicePage,
	getClientWarehouseInvoiceRows,
} from "./warehouse-invoice-client";

const rows: ClientWarehouseMaterialRow[] = [
	{
		id: "a",
		name: "Concrete",
		quantity: 2,
		categoryId: "configured",
		categoryName: "Concrete",
		measurementUnit: "m3",
		cost: 20,
		invoiceNr: "INV-1",
		invoiceDate: new Date("2026-01-10T00:00:00.000Z"),
		materialDate: new Date("2026-01-11T00:00:00.000Z"),
		supplierName: "Supplier A",
		importBatchId: "batch-1",
		sourcePhoto: "invoice.pdf",
		BISId: null,
		bisStatus: null,
		createdAt: new Date("2026-01-12T00:00:00.000Z"),
		forma2PositionId: "position-b",
	},
	{
		id: "b",
		name: "Sand",
		quantity: 1,
		categoryId: null,
		categoryName: null,
		measurementUnit: "kg",
		cost: 10,
		invoiceNr: "INV-1",
		invoiceDate: new Date("2026-01-10T00:00:00.000Z"),
		materialDate: new Date("2026-01-09T00:00:00.000Z"),
		supplierName: "Supplier A",
		importBatchId: "batch-1",
		sourcePhoto: "invoice.pdf",
		BISId: "bis-1",
		bisStatus: "approved",
		createdAt: new Date("2026-01-11T00:00:00.000Z"),
		forma2PositionId: "position-a",
	},
	{
		id: "c",
		name: "Pump",
		quantity: 3,
		categoryId: null,
		categoryName: null,
		measurementUnit: "h",
		cost: 30,
		invoiceNr: "INV-2",
		invoiceDate: new Date("2026-02-10T00:00:00.000Z"),
		materialDate: null,
		supplierName: "Supplier B",
		importBatchId: null,
		sourcePhoto: "invoice-2.pdf",
		BISId: null,
		bisStatus: null,
		createdAt: new Date("2026-02-11T00:00:00.000Z"),
		forma2PositionId: null,
	},
];

it("filters, sorts and paginates the complete client snapshot", () => {
	const result = queryClientWarehouseMaterials(
		rows,
		{
			supplierName: "Supplier A",
			status: "unsent",
			sortBy: "cost_desc",
			page: 1,
			pageSize: 1,
		},
		{
			showSpendInsights: true,
		},
	);

	expect(result.rows.map((row) => row.id)).toEqual(["a"]);
	expect(result.totalCount).toBe(1);
	expect(result.totalCost).toBe(20);
	expect(result.spendInsights?.supplierTotals).toEqual([
		{ key: "supplier a", label: "Supplier A", totalCost: 20, count: 1 },
	]);
});

it("sorts Forma 2 positions locally and keeps unassigned rows last", () => {
	const result = queryClientWarehouseMaterials(
		rows,
		{
			sortBy: "forma2Position_asc",
		},
		{
			showSpendInsights: false,
			forma2Positions: [
				{ id: "position-a", code: "A" },
				{ id: "position-b", code: "B" },
			],
		},
	);

	expect(result.rows.map((row) => row.id)).toEqual(["b", "a", "c"]);
});

it("builds spend insights and invoice groups without server requests", () => {
	expect(buildClientWarehouseSpendInsights(rows).monthlyTotals).toEqual([
		{ key: "2026-02", label: "2026-02", totalCost: 30, count: 1 },
		{ key: "2026-01", label: "2026-01", totalCost: 30, count: 2 },
	]);

	const page = buildClientWarehouseInvoicePage(rows, {}, { limit: 1 });
	expect(page.totalCount).toBe(2);
	expect(page.invoices[0]).toMatchObject({
		invoiceNumber: "INV-2",
		itemCount: 1,
	});
	expect(page.nextOffset).toBe(1);

	const batchRows = getClientWarehouseInvoiceRows(rows, {
		type: "batch",
		value: "batch-1",
	});
	expect(batchRows.map((row) => row.id)).toEqual(["b", "a"]);
});
