import type { TgemDashboardInvoice } from "@/lib/tgem-invoice-approval/dashboard-types";
import {
	countActiveTgemInvoiceFilters,
	createDefaultTgemInvoiceRegisterFilters,
	filterTgemInvoiceRegister,
	getTgemInvoiceRegisterFacets,
	TGEM_FILTER_MISSING_VALUE,
} from "@/lib/tgem-invoice-approval/register-filtering";

function invoice(
	overrides: Partial<TgemDashboardInvoice> = {},
): TgemDashboardInvoice {
	return {
		id: "invoice-1",
		project: { id: "site-1", name: "Riga" },
		source: "dashboard",
		status: "in_approval",
		ocrStatus: "complete",
		extractionStatus: "complete",
		invoiceNumber: "INV-100",
		supplierName: "Baltic Build SIA",
		supplierRegistrationNo: "40000000000",
		invoiceDate: "2026-09-01T00:00:00.000Z",
		dueDate: "2026-09-30T00:00:00.000Z",
		currency: "EUR",
		subtotal: "100",
		vat: "21",
		total: "121",
		bankAccount: "LV00BANK0000000000000",
		reference: "Project A",
		invoiceType: "debit",
		costCode: "A100",
		validationSummary: null,
		extractionSummary: null,
		fieldAnchors: {},
		receivedAt: "2026-09-02T22:30:00.000Z",
		approvedAt: null,
		paymentStatus: "unpaid",
		paidAt: null,
		createdAt: "2026-09-02T22:30:00.000Z",
		updatedAt: "2026-09-03T00:00:00.000Z",
		approvalRound: 2,
		documents: [],
		lines: [],
		approvalSteps: [
			{
				id: "old-step",
				stepOrder: 1,
				approvalRound: 1,
				roleKey: "project_review",
				role: null,
				approverUserId: "old-user",
				approverName: "Old Approver",
				templateRevision: 1,
				minimumInvoiceTotal: null,
				thresholdCurrency: null,
				status: "current",
				comment: null,
				decidedAt: null,
			},
			{
				id: "current-step",
				stepOrder: 1,
				approvalRound: 2,
				roleKey: "project_review",
				role: null,
				approverUserId: "user-1",
				approverName: "Anna",
				templateRevision: 2,
				minimumInvoiceTotal: null,
				thresholdCurrency: null,
				status: "current",
				comment: null,
				decidedAt: null,
			},
		],
		auditEvents: [],
		...overrides,
	};
}

describe("TGEM invoice register filtering", () => {
	it("searches all supported invoice identity fields", () => {
		const row = invoice();
		for (const search of [
			"inv-100",
			"baltic build",
			"40000000000",
			"project a",
			"lv00bank",
		]) {
			const filters = createDefaultTgemInvoiceRegisterFilters();
			filters.search = search;
			expect(filterTgemInvoiceRegister([row], filters)).toEqual([row]);
		}
	});

	it("uses OR inside groups and AND between groups", () => {
		const matching = invoice();
		const wrongSupplier = invoice({
			id: "invoice-2",
			supplierName: "Other",
		});
		const wrongStatus = invoice({ id: "invoice-3", status: "rejected" });
		const filters = createDefaultTgemInvoiceRegisterFilters();
		filters.statuses = ["in_approval", "approved"];
		filters.suppliers = ["Baltic Build SIA"];
		expect(
			filterTgemInvoiceRegister(
				[matching, wrongSupplier, wrongStatus],
				filters,
			).map((row) => row.id),
		).toEqual(["invoice-1"]);
	});

	it("filters receipts as a first-class document type", () => {
		const receipt = invoice({ id: "receipt-1", invoiceType: "receipt" });
		const debit = invoice({ id: "debit-1", invoiceType: "debit" });
		const filters = createDefaultTgemInvoiceRegisterFilters();
		filters.invoiceTypes = ["receipt"];
		expect(filterTgemInvoiceRegister([receipt, debit], filters)).toEqual([
			receipt,
		]);
	});

	it("filters paid and unpaid invoices independently from approval status", () => {
		const unpaid = invoice({ id: "unpaid", status: "approved" });
		const paid = invoice({
			id: "paid",
			status: "approved",
			paymentStatus: "paid",
			paidAt: "2026-09-05T10:00:00.000Z",
		});
		const filters = createDefaultTgemInvoiceRegisterFilters();
		filters.paymentStatuses = ["unpaid"];
		expect(filterTgemInvoiceRegister([unpaid, paid], filters)).toEqual([
			unpaid,
		]);
		filters.paymentStatuses = ["paid"];
		expect(filterTgemInvoiceRegister([unpaid, paid], filters)).toEqual([paid]);
	});

	it("matches only the current approval round and supports unassigned", () => {
		const assigned = invoice();
		const unassigned = invoice({ id: "invoice-2", approvalSteps: [] });
		const filters = createDefaultTgemInvoiceRegisterFilters();
		filters.approverUserIds = ["old-user"];
		expect(filterTgemInvoiceRegister([assigned], filters)).toEqual([]);
		filters.approverUserIds = ["user-1"];
		expect(filterTgemInvoiceRegister([assigned], filters)).toEqual([assigned]);
		filters.approverUserIds = [TGEM_FILTER_MISSING_VALUE];
		expect(filterTgemInvoiceRegister([assigned, unassigned], filters)).toEqual([
			unassigned,
		]);
	});

	it("filters missing values with OR semantics", () => {
		const missingSupplier = invoice({ supplierName: null });
		const missingTotal = invoice({ id: "invoice-2", total: null });
		const complete = invoice({ id: "invoice-3" });
		const filters = createDefaultTgemInvoiceRegisterFilters();
		filters.missingFields = ["supplierName", "total"];
		expect(
			filterTgemInvoiceRegister(
				[missingSupplier, missingTotal, complete],
				filters,
			).map((row) => row.id),
		).toEqual(["invoice-1", "invoice-2"]);
	});

	it("uses inclusive dates and Riga dates for received timestamps", () => {
		const row = invoice();
		const filters = createDefaultTgemInvoiceRegisterFilters();
		filters.invoiceDateFrom = "2026-09-01";
		filters.invoiceDateTo = "2026-09-01";
		filters.receivedDateFrom = "2026-09-03";
		filters.receivedDateTo = "2026-09-03";
		expect(filterTgemInvoiceRegister([row], filters)).toEqual([row]);
		filters.receivedDateFrom = "2026-09-02";
		filters.receivedDateTo = "2026-09-02";
		expect(filterTgemInvoiceRegister([row], filters)).toEqual([]);
	});

	it("handles signed ranges, zero, missing and combined filters", () => {
		const negative = invoice({ id: "negative", subtotal: "-20", total: "0" });
		const positive = invoice({ id: "positive", subtotal: "50", total: "60" });
		const missing = invoice({ id: "missing", subtotal: null, total: null });
		const filters = createDefaultTgemInvoiceRegisterFilters();
		filters.netAmountMin = "-20";
		filters.netAmountMax = "0";
		filters.grossAmountMin = "0";
		filters.grossAmountMax = "0";
		expect(
			filterTgemInvoiceRegister([negative, positive, missing], filters).map(
				(row) => row.id,
			),
		).toEqual(["negative"]);
	});

	it("derives stable facets and counts active conditions", () => {
		const facets = getTgemInvoiceRegisterFacets(
			[
				invoice(),
				invoice({
					id: "invoice-2",
					supplierName: null,
					currency: null,
					approvalSteps: [],
				}),
			],
			"en-GB",
		);
		expect(facets.suppliers).toEqual([
			{ value: "Baltic Build SIA", label: "Baltic Build SIA" },
			{ value: TGEM_FILTER_MISSING_VALUE, label: TGEM_FILTER_MISSING_VALUE },
		]);
		expect(facets.approvers).toEqual([
			{ value: "user-1", label: "Anna" },
			{ value: TGEM_FILTER_MISSING_VALUE, label: TGEM_FILTER_MISSING_VALUE },
		]);
		const filters = createDefaultTgemInvoiceRegisterFilters();
		filters.search = "invoice";
		filters.statuses = ["approved", "rejected"];
		filters.invoiceDateFrom = "2026-01-01";
		filters.netAmountMax = "100";
		expect(countActiveTgemInvoiceFilters(filters)).toBe(5);
	});
});
