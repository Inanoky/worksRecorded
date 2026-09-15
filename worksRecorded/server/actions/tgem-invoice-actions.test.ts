const mockRequireUser = jest.fn();
const mockProcessTgemInvoice = jest.fn();
const mockPersistTgemInvoiceOcrResult = jest.fn();
const mockStartTgemInvoiceApproval = jest.fn();
const mockPrisma = {
	site: { findFirst: jest.fn() },
	tgemInvoiceCase: { findMany: jest.fn(), update: jest.fn() },
	tgemInvoiceDocument: { findFirst: jest.fn() },
	tgemInvoiceAuditEvent: { create: jest.fn() },
	user: { findMany: jest.fn(), findUnique: jest.fn() },
	tgemInvoiceApprovalTemplate: { findFirst: jest.fn() },
	tgemInvoiceWorkflowManager: { findMany: jest.fn() },
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
		mockPrisma.tgemInvoiceCase.findMany.mockResolvedValue([]);
		mockPrisma.user.findMany.mockResolvedValue([]);
		mockPrisma.tgemInvoiceApprovalTemplate.findFirst.mockResolvedValue(null);
		mockPrisma.tgemInvoiceWorkflowManager.findMany.mockResolvedValue([]);
	});

	it("gives the active project owner both workflow capabilities", async () => {
		mockPrisma.site.findFirst.mockResolvedValue({
			id: "site-1",
			organizationId: "org-1",
			userId: "user-1",
			tgemInvoiceWorkflowManagers: [],
		});

		const result = await getTgemInvoiceDashboardData("site-1");

		expect(result?.approvalSetup).toEqual(
			expect.objectContaining({
				canManageWorkflow: true,
				canManageWorkflowManagers: true,
				ownerUserId: "user-1",
			}),
		);
		expect(mockPrisma.site.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					organization: {
						users: { some: { id: "user-1", status: "active" } },
					},
				}),
			}),
		);
	});

	it("lets an assigned manager configure the flow but not grant managers", async () => {
		mockPrisma.site.findFirst.mockResolvedValue({
			id: "site-1",
			organizationId: "org-1",
			userId: "owner-1",
			tgemInvoiceWorkflowManagers: [{ id: "manager-1" }],
		});
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
		mockPrisma.site.findFirst.mockResolvedValue({
			id: "site-1",
			organizationId: "org-1",
			userId: "owner-1",
			tgemInvoiceWorkflowManagers: [],
		});

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
		mockPrisma.site.findFirst.mockResolvedValue({
			id: "site-1",
			organizationId: "org-1",
			userId: "owner-1",
			tgemInvoiceWorkflowManagers: [],
		});

		const result = await getTgemInvoiceDashboardData("site-1");

		expect(mockPrisma.site.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					id: "site-1",
					organization: {
						users: {
							some: {
								id: "kp_2f5c0987b83a4162ac8819f6339534f8",
								status: "active",
							},
						},
					},
				},
			}),
		);
		expect(result?.approvalSetup).toEqual(
			expect.objectContaining({
				canManageWorkflow: true,
				canManageWorkflowManagers: false,
			}),
		);
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
			storageProvider: "uploadthing",
			storageKey: "invoice.jpg",
			canonicalUrl: "https://files.example.test/invoice.jpg",
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
