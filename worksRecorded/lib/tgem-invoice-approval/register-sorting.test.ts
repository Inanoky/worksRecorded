import type { TgemDashboardInvoice } from "@/lib/tgem-invoice-approval/dashboard-types";
import {
	sortTgemInvoiceRegister,
	type TgemInvoiceSortField,
} from "./register-sorting";

function invoice(id: string, values: Partial<TgemDashboardInvoice> = {}) {
	return {
		id,
		invoiceNumber: null,
		project: null,
		supplierName: null,
		invoiceDate: null,
		dueDate: null,
		total: null,
		status: "unknown",
		...values,
	} as TgemDashboardInvoice;
}

const context = {
	locale: "lv-LV",
	statusLabels: { approved: "Apstiprināts", in_approval: "Gaida" },
	getCurrentApprover: (row: TgemDashboardInvoice) =>
		row.id === "first" ? "Anna" : row.id === "second" ? "Zane" : null,
};
function ids(rows: TgemDashboardInvoice[]) {
	return rows.map((row) => row.id);
}

describe("TGEM invoice register sorting", () => {
	it("keeps the default arrival order without mutating the source", () => {
		const rows = [invoice("second"), invoice("first")];
		expect(ids(sortTgemInvoiceRegister(rows, null, context))).toEqual([
			"second",
			"first",
		]);
		expect(sortTgemInvoiceRegister(rows, null, context)).not.toBe(rows);
	});

	it("uses natural invoice-number ordering", () => {
		const rows = [
			invoice("second", { invoiceNumber: "INV-10" }),
			invoice("first", { invoiceNumber: "inv-2" }),
		];
		expect(
			ids(
				sortTgemInvoiceRegister(
					rows,
					{ field: "invoiceNumber", direction: "asc" },
					context,
				),
			),
		).toEqual(["first", "second"]);
		expect(
			ids(
				sortTgemInvoiceRegister(
					rows,
					{ field: "invoiceNumber", direction: "desc" },
					context,
				),
			),
		).toEqual(["second", "first"]);
		expect(ids(rows)).toEqual(["second", "first"]);
	});

	it.each(["project", "supplier"] as const)(
		"sorts %s using Latvian names",
		(field) => {
			const rows = [
				invoice("second", {
					project: { id: "p2", name: "Žagari" },
					supplierName: "Žagari",
				}),
				invoice("first", {
					project: { id: "p1", name: "Ābele" },
					supplierName: "Ābele",
				}),
			];
			expect(
				ids(
					sortTgemInvoiceRegister(rows, { field, direction: "asc" }, context),
				),
			).toEqual(["first", "second"]);
		},
	);

	it("sorts decimal, zero, and negative totals numerically", () => {
		const rows = [
			invoice("large", { total: "1000.50" }),
			invoice("small", { total: "9.99" }),
			invoice("zero", { total: "0" }),
			invoice("credit", { total: "-10" }),
			invoice("missing"),
		];
		expect(
			ids(
				sortTgemInvoiceRegister(
					rows,
					{ field: "total", direction: "asc" },
					context,
				),
			),
		).toEqual(["credit", "zero", "small", "large", "missing"]);
		expect(
			ids(
				sortTgemInvoiceRegister(
					rows,
					{ field: "total", direction: "desc" },
					context,
				),
			),
		).toEqual(["large", "small", "zero", "credit", "missing"]);
	});

	it.each(["invoiceDate", "dueDate"] as const)(
		"sorts %s chronologically across months and years",
		(field) => {
			const rows = [
				invoice("second", { [field]: "2026-01-01T00:00:00.000Z" }),
				invoice("first", { [field]: "2025-12-31T00:00:00.000Z" }),
				invoice("missing"),
			];
			expect(
				ids(
					sortTgemInvoiceRegister(rows, { field, direction: "asc" }, context),
				),
			).toEqual(["first", "second", "missing"]);
			expect(
				ids(
					sortTgemInvoiceRegister(rows, { field, direction: "desc" }, context),
				),
			).toEqual(["second", "first", "missing"]);
		},
	);

	it("sorts by displayed status labels rather than internal status keys", () => {
		const rows = [
			invoice("second", { status: "approved" }),
			invoice("first", { status: "in_approval" }),
		];
		expect(
			ids(
				sortTgemInvoiceRegister(
					rows,
					{ field: "status", direction: "asc" },
					{
						...context,
						statusLabels: { approved: "Z approved", in_approval: "A pending" },
					},
				),
			),
		).toEqual(["first", "second"]);
	});

	it("uses the current approver and leaves unassigned invoices last", () => {
		const rows = [invoice("missing"), invoice("second"), invoice("first")];
		expect(
			ids(
				sortTgemInvoiceRegister(
					rows,
					{ field: "currentApprover", direction: "asc" },
					context,
				),
			),
		).toEqual(["first", "second", "missing"]);
	});

	it.each(["asc", "desc"] as const)(
		"keeps equal and missing values stable in %s order",
		(direction) => {
			const rows = [
				invoice("empty1"),
				invoice("same1", { invoiceNumber: "SAME" }),
				invoice("empty2", { invoiceNumber: " " }),
				invoice("same2", { invoiceNumber: "same" }),
			];
			expect(
				ids(
					sortTgemInvoiceRegister(
						rows,
						{ field: "invoiceNumber", direction },
						context,
					),
				),
			).toEqual(["same1", "same2", "empty1", "empty2"]);
		},
	);

	it.each(["total", "invoiceDate", "dueDate"] as const)(
		"keeps invalid %s values last",
		(field: TgemInvoiceSortField) => {
			const rows = [
				invoice("invalid", { [field]: "invalid" }),
				invoice("first", {
					total: "0",
					invoiceDate: "2026-01-01",
					dueDate: "2026-01-01",
				}),
			];
			expect(
				ids(
					sortTgemInvoiceRegister(rows, { field, direction: "desc" }, context),
				),
			).toEqual(["first", "invalid"]);
		},
	);
});
