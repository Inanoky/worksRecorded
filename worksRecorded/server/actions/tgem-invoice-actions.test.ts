const mockRequireUser = jest.fn();
const mockProcessTgemInvoice = jest.fn();
const mockPersistTgemInvoiceOcrResult = jest.fn();
const mockStartTgemInvoiceApproval = jest.fn();
const mockPrisma = {
	site: { findFirst: jest.fn(), findMany: jest.fn() },
	tgemInvoiceCase: { findMany: jest.fn(), update: jest.fn() },
	tgemInvoiceDocument: { findFirst: jest.fn() },
	tgemInvoiceAuditEvent: { create: jest.fn() },
	user: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
	tgemInvoiceApprovalTemplate: { findFirst: jest.fn() },
	tgemInvoiceWorkflowManager: { findMany: jest.fn() },
	tgemCostCode: { findMany: jest.fn() },
};

jest.mock("@/lib/utils/db", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));
jest.mock("@/lib/tgem-invoice-approval/fixture", () => ({
	isTgemInvoiceFixtureModeEnabled: () => false,
	ensureTgemInvoiceFixture: jest.fn(),
}));
jest.mock("@/lib/tgem-invoice-approval/processor", () => ({
	processTgemInvoice: (...args: unknown[]) => mockProcessTgemInvoice(...args),
}));
jest.mock("@/lib/tgem-invoice-approval/ocr", () => ({
	persistTgemInvoiceOcrResult: (...args: unknown[]) =>
		mockPersistTgemInvoiceOcrResult(...args),
}));
jest.mock("@/lib/tgem-invoice-approval/start-approval", () => ({
	startTgemInvoiceApproval: (...args: unknown[]) =>
		mockStartTgemInvoiceApproval(...args),
}));

import {
	getTgemInvoiceDashboardData,
	runTgemInvoiceOcr,
} from "@/server/actions/tgem-invoice-actions";

describe("TGEM invoice dashboard authorization data", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockRequireUser.mockResolvedValue({ id: "user-1" });
		mockPrisma.user.findFirst.mockResolvedValue({ organizationId: "org-1" });
		mockPrisma.site.findMany.mockResolvedValue([
			{ id: "site-1", name: "Riga office", userId: "user-1" },
		]);
		mockPrisma.tgemInvoiceCase.findMany.mockResolvedValue([]);
		mockPrisma.user.findMany.mockResolvedValue([]);
		mockPrisma.tgemInvoiceApprovalTemplate.findFirst.mockResolvedValue(null);
		mockPrisma.tgemInvoiceWorkflowManager.findMany.mockResolvedValue([]);
		mockPrisma.tgemCostCode.findMany.mockResolvedValue([]);
	});

	it("gives the active project owner both workflow capabilities", async () => {
		const result = await getTgemInvoiceDashboardData("site-1");

		expect(result?.approvalSetup).toEqual(
			expect.objectContaining({
				canManageWorkflow: true,
				canManageWorkflowManagers: true,
				ownerUserId: "user-1",
			}),
		);
		expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
			where: { id: "user-1", status: "active" },
			select: { organizationId: true },
		});
	});

	it("lets an assigned manager configure the flow but not grant managers", async () => {
		mockPrisma.site.findMany.mockResolvedValue([
			{ id: "site-1", name: "Riga office", userId: "owner-1" },
		]);
		mockPrisma.tgemInvoiceWorkflowManager.findMany.mockResolvedValue([
			{ userId: "user-1" },
		]);

		const result = await getTgemInvoiceDashboardData("site-1");

		expect(result?.approvalSetup).toEqual(
			expect.objectContaining({
				canManageWorkflow: true,
				canManageWorkflowManagers: false,
				workflowManagerUserIds: ["user-1"],
			}),
		);
	});

	it("lets an ordinary active member configure the approval sequence", async () => {
		mockPrisma.site.findMany.mockResolvedValue([
			{ id: "site-1", name: "Riga office", userId: "owner-1" },
		]);

		const result = await getTgemInvoiceDashboardData("site-1");

		expect(result?.approvalSetup).toEqual(
			expect.objectContaining({
				canManageWorkflow: true,
				canManageWorkflowManagers: false,
			}),
		);
	});

	it("keeps the organization-switching admin organization-scoped with sequence access", async () => {
		mockRequireUser.mockResolvedValue({
			id: "kp_2f5c0987b83a4162ac8819f6339534f8",
		});
		mockPrisma.user.findFirst.mockResolvedValue({ organizationId: "org-1" });
		mockPrisma.site.findMany.mockResolvedValue([
			{ id: "site-1", name: "Riga office", userId: "owner-1" },
		]);

		const result = await getTgemInvoiceDashboardData("site-1");

		expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
			where: {
				id: "kp_2f5c0987b83a4162ac8819f6339534f8",
				status: "active",
			},
			select: { organizationId: true },
		});
		expect(result?.approvalSetup).toEqual(
			expect.objectContaining({
				canManageWorkflow: true,
				canManageWorkflowManagers: false,
			}),
		);
	});

	it("loads one organization-wide invoice register without choosing a project", async () => {
		const result = await getTgemInvoiceDashboardData();

		expect(mockPrisma.tgemInvoiceCase.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { organizationId: "org-1" } }),
		);
		expect(result).toEqual(
			expect.objectContaining({
				projects: [{ id: "site-1", name: "Riga office" }],
				approvalSetup: null,
			}),
		);
		expect(
			mockPrisma.tgemInvoiceApprovalTemplate.findFirst,
		).not.toHaveBeenCalled();
	});

	it("filters the organization register to unassigned invoices", async () => {
		await getTgemInvoiceDashboardData("unassigned");

		expect(mockPrisma.tgemInvoiceCase.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { organizationId: "org-1", siteId: null },
			}),
		);
	});

	it("serializes invoice and line fields required by filtering and export", async () => {
		mockPrisma.tgemInvoiceCase.findMany.mockResolvedValue([
			{
				id: "invoice-1",
				site: { id: "site-1", name: "Riga office" },
				source: "dashboard",
				status: "approved",
				ocrStatus: "complete",
				extractionStatus: "complete",
				invoiceNumber: "INV-1",
				supplierName: "Supplier",
				supplierRegistrationNo: "4000",
				invoiceDate: new Date("2026-09-01T00:00:00.000Z"),
				dueDate: null,
				currency: "EUR",
				subtotal: 100,
				vat: 21,
				total: 121,
				bankAccount: null,
				reference: null,
				invoiceType: "debit",
				costCode: "A100",
				validationSummary: null,
				extractionSummary: null,
				receivedAt: new Date("2026-09-02T10:00:00.000Z"),
				approvedAt: new Date("2026-09-03T10:00:00.000Z"),
				paymentStatus: "paid",
				paidAt: new Date("2026-09-04T10:00:00.000Z"),
				createdAt: new Date("2026-09-02T10:00:00.000Z"),
				updatedAt: new Date("2026-09-03T10:00:00.000Z"),
				approvalRound: 1,
				documents: [],
				lines: [
					{
						id: "line-1",
						lineNumber: 1,
						description: "Concrete",
						quantity: 2,
						unit: "m3",
						unitPrice: 50,
						total: 100,
						currency: "EUR",
						costCode: "L100",
						category: "Materials",
						suggestedCostCode: "AI100",
						suggestedCategory: "AI materials",
						aiConfidence: 0.9,
					},
				],
				approvalSteps: [],
				auditEvents: [],
			},
		]);

		const result = await getTgemInvoiceDashboardData("site-1");

		expect(result?.invoices[0]).toEqual(
			expect.objectContaining({
				receivedAt: "2026-09-02T10:00:00.000Z",
				approvedAt: "2026-09-03T10:00:00.000Z",
				paymentStatus: "paid",
				paidAt: "2026-09-04T10:00:00.000Z",
			}),
		);
		expect(result?.invoices[0].lines[0]).toEqual(
			expect.objectContaining({
				costCode: "L100",
				category: "Materials",
			}),
		);
	});

	it("rejects a project filter outside the active organization", async () => {
		await expect(
			getTgemInvoiceDashboardData("site-from-another-org"),
		).rejects.toThrow("Project access denied");
		expect(mockPrisma.tgemInvoiceCase.findMany).not.toHaveBeenCalled();
	});
});

describe("TGEM invoice processing", () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		jest.clearAllMocks();
		mockRequireUser.mockResolvedValue({ id: "user-1" });
		mockPrisma.user.findUnique.mockResolvedValue({ organizationId: "org-1" });
		mockPrisma.tgemInvoiceDocument.findFirst.mockResolvedValue({
			id: "document-1",
			contentType: "image/jpeg",
			byteSize: 12_000,
			storageProvider: "uploadthing",
			storageKey: "invoice.jpg",
			canonicalUrl: "https://files.example.test/invoice.jpg",
			invoiceCase: {
				siteId: "site-1",
				source: "dashboard",
			},
		});
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			arrayBuffer: async () => Buffer.from("invoice"),
		}) as never;
		mockProcessTgemInvoice.mockResolvedValue({
			provider: "openai",
			pages: [],
			fields: {},
			lineItems: [],
		});
		mockPersistTgemInvoiceOcrResult.mockResolvedValue({
			pageCount: 1,
			lineItemCount: 2,
			warningCount: 0,
		});
		mockStartTgemInvoiceApproval.mockResolvedValue({
			invoiceCaseId: "invoice-1",
			approvalRound: 1,
			currentApproverUserId: "approver-1",
			finalApproverUserId: "approver-3",
		});
	});

	afterAll(() => {
		global.fetch = originalFetch;
	});

	it("uses the processor boundary and records a provider-neutral completion event", async () => {
		await expect(
			runTgemInvoiceOcr({
				invoiceCaseId: "invoice-1",
				documentId: "document-1",
			}),
		).resolves.toEqual({
			provider: "openai",
			pageCount: 1,
			lineItemCount: 2,
			warningCount: 0,
		});

		expect(mockProcessTgemInvoice).toHaveBeenCalledWith({
			content: Buffer.from("invoice"),
			mimeType: "image/jpeg",
		});
		expect(mockPrisma.tgemInvoiceAuditEvent.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				eventType: "invoice_extraction_completed",
				payload: expect.objectContaining({ provider: "openai" }),
			}),
		});
		expect(mockStartTgemInvoiceApproval).toHaveBeenCalledWith({
			invoiceCaseId: "invoice-1",
			actorUserId: "user-1",
			trigger: "automatic",
		});
	});

	it("keeps the extracted invoice reviewable when automatic assignment cannot start", async () => {
		mockStartTgemInvoiceApproval.mockRejectedValue(
			new Error("Configure the project approval flow before submitting"),
		);

		await expect(
			runTgemInvoiceOcr({
				invoiceCaseId: "invoice-1",
				documentId: "document-1",
			}),
		).resolves.toEqual({
			provider: "openai",
			pageCount: 1,
			lineItemCount: 2,
			warningCount: 0,
		});

		expect(mockPrisma.tgemInvoiceAuditEvent.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				eventType: "invoice_approval_auto_start_skipped",
				fromStatus: "needs_review",
				toStatus: "needs_review",
				payload: {
					reason: "Configure the project approval flow before submitting",
				},
			}),
		});
	});
});
