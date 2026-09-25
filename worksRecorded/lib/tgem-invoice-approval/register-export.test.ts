import * as XLSX from "xlsx";
import type { TgemDashboardInvoice } from "@/lib/tgem-invoice-approval/dashboard-types";
import { buildTgemInvoiceWorkbook } from "@/lib/tgem-invoice-approval/register-export";

function invoice(): TgemDashboardInvoice {
	return {
		id: "invoice-1",
		project: { id: "site-1", name: "Riga" },
		source: "dashboard",
		status: "approved",
		ocrStatus: "complete",
		extractionStatus: "complete",
		invoiceNumber: "INV-1",
		supplierName: "Supplier",
		supplierRegistrationNo: "4000",
		invoiceDate: "2026-09-01T00:00:00.000Z",
		dueDate: null,
		currency: "EUR",
		subtotal: "100.50",
		vat: "21.105",
		total: "121.605",
		bankAccount: null,
		reference: "Reference",
		invoiceType: "credit",
		costCode: "A100",
		validationSummary: null,
		extractionSummary: null,
		fieldAnchors: {},
		receivedAt: "2026-09-02T10:00:00.000Z",
		approvedAt: "2026-09-03T10:00:00.000Z",
		paymentStatus: "unpaid",
		paidAt: null,
		createdAt: "2026-09-02T10:00:00.000Z",
		updatedAt: "2026-09-03T10:00:00.000Z",
		approvalRound: 1,
		documents: [],
		lines: [
			{
				id: "line-1",
				lineNumber: 1,
				description: "Concrete",
				quantity: "2",
				unit: "m3",
				unitPrice: "50.25",
				total: "100.50",
				currency: "EUR",
				costCode: "L100",
				category: "Materials",
				suggestedCostCode: "AI100",
				suggestedCategory: "AI materials",
				aiConfidence: 0.95,
			},
		],
		approvalSteps: [
			{
				id: "step-1",
				stepOrder: 1,
				approvalRound: 1,
				roleKey: "project_review",
				role: null,
				approverUserId: "user-1",
				approverName: "Anna",
				templateRevision: 1,
				minimumInvoiceTotal: null,
				thresholdCurrency: null,
				status: "current",
				comment: null,
				decidedAt: null,
			},
		],
		auditEvents: [],
	};
}

describe("TGEM invoice workbook", () => {
	it("builds localized invoice and line-item sheets with typed values", () => {
		const workbook = buildTgemInvoiceWorkbook(XLSX, [invoice()], {
			language: "en",
			labels: {
				statuses: { approved: "Approved" },
				sources: { dashboard: "Dashboard" },
				processingStatuses: { complete: "Complete" },
			},
		});
		expect(workbook.SheetNames).toEqual(["Invoices", "Line items"]);
		const invoiceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
			workbook.Sheets.Invoices,
			{ raw: true },
		);
		const lineRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
			workbook.Sheets["Line items"],
			{ raw: true },
		);
		expect(invoiceRows).toHaveLength(1);
		expect(invoiceRows[0]).toEqual(
			expect.objectContaining({
				"Invoice number": "INV-1",
				"Document type": "Credit invoice",
				"Total excl. VAT": 100.5,
				VAT: 21.105,
				Total: 121.605,
				Status: "Approved",
				"Current approver": "Anna",
			}),
		);
		expect(invoiceRows[0]["Invoice date"]).toBeInstanceOf(Date);
		expect(invoiceRows[0]["Due date"]).toBeNull();
		expect(lineRows).toEqual([
			expect.objectContaining({
				"Invoice number": "INV-1",
				Description: "Concrete",
				Quantity: 2,
				"Unit price": 50.25,
				"Cost code": "L100",
				Category: "Materials",
				"AI confidence": 0.95,
			}),
		]);
		expect(invoiceRows[0]).not.toHaveProperty("Invoice ID");
		expect(lineRows[0]).not.toHaveProperty("Invoice ID");
		expect(JSON.stringify({ invoiceRows, lineRows })).not.toContain(
			"invoice-1",
		);
		expect(workbook.Sheets.Invoices["!autofilter"]).toBeDefined();
		expect(workbook.Sheets["Line items"]["!autofilter"]).toBeDefined();
	});

	it("keeps both localized sheets when filtered invoices have no lines", () => {
		const row = invoice();
		row.lines = [];
		const workbook = buildTgemInvoiceWorkbook(XLSX, [row], {
			language: "lv",
			labels: {
				statuses: { approved: "Apstiprināts" },
				sources: { dashboard: "Web panelis" },
				processingStatuses: { complete: "Pabeigts" },
			},
		});
		expect(workbook.SheetNames).toEqual(["Rēķini", "Pozīcijas"]);
		expect(XLSX.utils.sheet_to_json(workbook.Sheets.Pozīcijas)).toEqual([]);
	});

	it("exports receipt classification as Čeks in Latvian", () => {
		const row = invoice();
		row.invoiceType = "receipt";
		const workbook = buildTgemInvoiceWorkbook(XLSX, [row], {
			language: "lv",
			labels: {
				statuses: { approved: "Apstiprināts" },
				sources: { dashboard: "Web panelis" },
				processingStatuses: { complete: "Pabeigts" },
			},
		});
		const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
			workbook.Sheets.Rēķini,
			{ raw: true },
		);
		expect(rows[0]["Dokumenta veids"]).toBe("Čeks");
	});

	it.each([
		["lv", "Rēķina ID"],
		["en", "Invoice ID"],
		["ru", "ID счёта"],
	])(
		"omits internal invoice identifiers from %s exports",
		(language, idLabel) => {
			const workbook = buildTgemInvoiceWorkbook(XLSX, [invoice()], {
				language,
				labels: {
					statuses: { approved: "Approved" },
					sources: { dashboard: "Dashboard" },
					processingStatuses: { complete: "Complete" },
				},
			});

			for (const sheetName of workbook.SheetNames) {
				const rows = XLSX.utils.sheet_to_json<Array<unknown>>(
					workbook.Sheets[sheetName],
					{ header: 1, raw: true },
				);
				expect(rows[0]).not.toContain(idLabel);
				expect(JSON.stringify(rows)).not.toContain("invoice-1");
			}
		},
	);
});
