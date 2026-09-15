import {
	isTgemApprovalStepApplicable,
	normalizeTgemApprovalCurrency,
	normalizeTgemApprovalTemplateSteps,
	validateTgemApprovalDecisionComment,
	validateTgemInvoiceApprovalParticipants,
} from "@/lib/tgem-invoice-approval/approval";

describe("TGEM invoice approval rules", () => {
	it("normalizes role keys, custom labels, and exact thresholds", () => {
		expect(
			normalizeTgemApprovalTemplateSteps([
				{
					approverUserId: " user-1 ",
					roleKey: "project_review",
					roleLabel: " Project manager ",
				},
				{
					approverUserId: "user-2",
					roleKey: "financial_review",
				},
				{
					approverUserId: "user-3",
					roleKey: "budget_approval",
				},
				{
					approverUserId: "user-4",
					roleKey: "senior_approval",
					minimumInvoiceTotal: "10000,5",
				},
			]),
		).toEqual([
			{
				approverUserId: "user-1",
				roleKey: "project_review",
				roleLabel: "Project manager",
				minimumInvoiceTotal: null,
			},
			{
				approverUserId: "user-2",
				roleKey: "financial_review",
				roleLabel: null,
				minimumInvoiceTotal: null,
			},
			{
				approverUserId: "user-3",
				roleKey: "budget_approval",
				roleLabel: null,
				minimumInvoiceTotal: null,
			},
			{
				approverUserId: "user-4",
				roleKey: "senior_approval",
				roleLabel: null,
				minimumInvoiceTotal: "10000.50",
			},
		]);
	});

	it("rejects duplicate approvers", () => {
		expect(() =>
			normalizeTgemApprovalTemplateSteps([
				{ approverUserId: "user-1", roleKey: "project_review" },
				{ approverUserId: "user-1", roleKey: "budget_approval" },
			]),
		).toThrow("only once");
	});

	it("accepts a simple ordered review chain without authority categories", () => {
		expect(
			normalizeTgemApprovalTemplateSteps([
				{ approverUserId: "user-1", roleKey: "project_review" },
				{ approverUserId: "user-2", roleKey: "financial_review" },
			]),
		).toHaveLength(2);
	});

	it("applies a threshold at the exact boundary and skips below it", () => {
		expect(
			isTgemApprovalStepApplicable({
				minimumInvoiceTotal: "5000.00",
				workflowCurrency: "EUR",
				invoiceTotal: "5000",
				invoiceCurrency: "EUR",
			}),
		).toBe(true);
		expect(
			isTgemApprovalStepApplicable({
				minimumInvoiceTotal: "5000.00",
				workflowCurrency: "EUR",
				invoiceTotal: "4999.99",
				invoiceCurrency: "EUR",
			}),
		).toBe(false);
	});

	it("fails closed for missing totals and non-EUR invoices", () => {
		expect(
			isTgemApprovalStepApplicable({
				minimumInvoiceTotal: "5000",
				workflowCurrency: "EUR",
				invoiceTotal: "100",
				invoiceCurrency: "GBP",
			}),
		).toBe(true);
		expect(
			isTgemApprovalStepApplicable({
				minimumInvoiceTotal: "5000",
				workflowCurrency: "EUR",
				invoiceTotal: null,
				invoiceCurrency: "EUR",
			}),
		).toBe(true);
		expect(() => normalizeTgemApprovalCurrency("GBP")).toThrow(
			"support EUR only",
		);
	});

	it("allows any assigned participant and requires an applicable step", () => {
		expect(
			validateTgemInvoiceApprovalParticipants({
				steps: [{ approverUserId: "user-1", applicable: true }],
			}),
		).toHaveLength(1);
		expect(() =>
			validateTgemInvoiceApprovalParticipants({
				steps: [],
			}),
		).toThrow("no applicable approver");
	});

	it("requires comments for negative decisions", () => {
		expect(() =>
			validateTgemApprovalDecisionComment("request_changes", ""),
		).toThrow("comment is required");
		expect(validateTgemApprovalDecisionComment("approve", "")).toBeNull();
	});
});
