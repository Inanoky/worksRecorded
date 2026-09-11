const mockRequireUser = jest.fn();
const mockPrisma = {
	site: { findFirst: jest.fn() },
	user: { findMany: jest.fn() },
	tgemInvoiceCase: { findFirst: jest.fn(), update: jest.fn() },
	tgemInvoiceApprovalTemplate: {
		findFirst: jest.fn(),
		updateMany: jest.fn(),
		create: jest.fn(),
	},
	tgemInvoiceApprovalStep: {
		createMany: jest.fn(),
		findFirst: jest.fn(),
		update: jest.fn(),
		updateMany: jest.fn(),
	},
	tgemInvoiceWorkflowManager: {
		deleteMany: jest.fn(),
		createMany: jest.fn(),
	},
	tgemInvoiceAuditEvent: { create: jest.fn() },
	$transaction: jest.fn(),
};

jest.mock("@/lib/utils/db", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

import {
	decideTgemInvoiceApproval,
	saveTgemApprovalTemplate,
	saveTgemWorkflowManagers,
	submitTgemInvoiceForApproval,
} from "@/server/actions/tgem-invoice-approval-actions";

function mockSiteAccess(input?: {
	ownerUserId?: string;
	workflowManager?: boolean;
}) {
	mockPrisma.site.findFirst.mockResolvedValue({
		id: "site-1",
		organizationId: "org-1",
		userId: input?.ownerUserId ?? "user-1",
		tgemInvoiceWorkflowManagers: input?.workflowManager
			? [{ id: "manager-1" }]
			: [],
	});
}

function approvalTemplate(totalThreshold = "10000") {
	return {
		revision: 4,
		currency: "EUR",
		steps: [
			{
				approverUserId: "user-1",
				roleKey: "project_review",
				role: null,
				minimumInvoiceTotal: null,
				approver: {
					id: "user-1",
					firstName: "Anna",
					lastName: "Bērziņa",
					status: "active",
					organizationId: "org-1",
				},
			},
			{
				approverUserId: "user-2",
				roleKey: "financial_review",
				role: "Accountant",
				minimumInvoiceTotal: null,
				approver: {
					id: "user-2",
					firstName: "Jānis",
					lastName: "Ozols",
					status: "active",
					organizationId: "org-1",
				},
			},
			{
				approverUserId: "user-3",
				roleKey: "budget_approval",
				role: "Commercial manager",
				minimumInvoiceTotal: null,
				approver: {
					id: "user-3",
					firstName: "Māra",
					lastName: "Liepa",
					status: "active",
					organizationId: "org-1",
				},
			},
			{
				approverUserId: "user-4",
				roleKey: "senior_approval",
				role: "Company owner",
				minimumInvoiceTotal: { toString: () => totalThreshold },
				approver: {
					id: "user-4",
					firstName: "Ilze",
					lastName: "Kalniņa",
					status: "active",
					organizationId: "org-1",
				},
			},
		],
	};
}

describe("TGEM invoice approval actions", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockRequireUser.mockResolvedValue({ id: "user-1" });
		mockPrisma.$transaction.mockImplementation(
			(callback: (transaction: typeof mockPrisma) => unknown) =>
				callback(mockPrisma),
		);
	});

	it("lets the project owner save a typed immutable template revision", async () => {
		mockSiteAccess();
		mockPrisma.user.findMany.mockResolvedValue([{ id: "user-2" }]);
		mockPrisma.tgemInvoiceApprovalTemplate.findFirst.mockResolvedValue({
			revision: 2,
		});
		mockPrisma.tgemInvoiceApprovalTemplate.create.mockResolvedValue({
			id: "template-3",
			revision: 3,
		});

		await saveTgemApprovalTemplate({
			siteId: "site-1",
			currency: "EUR",
			steps: [
				{
					approverUserId: "user-2",
					roleKey: "budget_approval",
					roleLabel: "Commercial manager",
				},
			],
		});

		expect(mockPrisma.tgemInvoiceApprovalTemplate.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					currency: "EUR",
					revision: 3,
					steps: {
						create: [
							expect.objectContaining({
								roleKey: "budget_approval",
								role: "Commercial manager",
							}),
						],
					},
				}),
			}),
		);
	});

	it("rejects template changes from an ordinary organization member", async () => {
		mockSiteAccess({ ownerUserId: "owner-1" });

		await expect(
			saveTgemApprovalTemplate({
				siteId: "site-1",
				steps: [{ approverUserId: "user-2", roleKey: "budget_approval" }],
			}),
		).rejects.toThrow("workflow manager");
		expect(
			mockPrisma.tgemInvoiceApprovalTemplate.create,
		).not.toHaveBeenCalled();
	});

	it("lets an assigned workflow manager edit the template but not manager access", async () => {
		mockSiteAccess({ ownerUserId: "owner-1", workflowManager: true });
		mockPrisma.user.findMany.mockResolvedValue([{ id: "user-2" }]);
		mockPrisma.tgemInvoiceApprovalTemplate.findFirst.mockResolvedValue(null);
		mockPrisma.tgemInvoiceApprovalTemplate.create.mockResolvedValue({
			id: "template-1",
		});

		await expect(
			saveTgemApprovalTemplate({
				siteId: "site-1",
				steps: [{ approverUserId: "user-2", roleKey: "budget_approval" }],
			}),
		).resolves.toEqual({ id: "template-1" });
		await expect(
			saveTgemWorkflowManagers({ siteId: "site-1", userIds: ["user-2"] }),
		).rejects.toThrow("project owner");
	});

	it("lets the project owner replace workflow-manager assignments", async () => {
		mockSiteAccess();
		mockPrisma.user.findMany.mockResolvedValue([{ id: "user-2" }]);

		await expect(
			saveTgemWorkflowManagers({
				siteId: "site-1",
				userIds: ["user-1", "user-2", "user-2"],
			}),
		).resolves.toEqual({ siteId: "site-1", userIds: ["user-2"] });
		expect(
			mockPrisma.tgemInvoiceWorkflowManager.deleteMany,
		).toHaveBeenCalledWith({ where: { siteId: "site-1" } });
		expect(
			mockPrisma.tgemInvoiceWorkflowManager.createMany,
		).toHaveBeenCalledWith({
			data: [
				{
					organizationId: "org-1",
					siteId: "site-1",
					userId: "user-2",
					createdByUserId: "user-1",
				},
			],
		});
	});

	it("snapshots a low-value invoice and marks senior approval as skipped", async () => {
		mockRequireUser.mockResolvedValue({ id: "submitter-1" });
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			id: "case-1",
			organizationId: "org-1",
			siteId: "site-1",
			submittedByUserId: "submitter-1",
			status: "needs_review",
			approvalRound: 1,
			total: { toString: () => "9999.99" },
			currency: "EUR",
		});
		mockPrisma.tgemInvoiceApprovalTemplate.findFirst.mockResolvedValue(
			approvalTemplate(),
		);

		await expect(
			submitTgemInvoiceForApproval({ invoiceCaseId: "case-1" }),
		).resolves.toEqual({ invoiceCaseId: "case-1", approvalRound: 2 });
		expect(mockPrisma.tgemInvoiceApprovalStep.createMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({
					stepOrder: 1,
					status: "current",
					roleKey: "project_review",
				}),
				expect.objectContaining({ stepOrder: 2, status: "waiting" }),
				expect.objectContaining({ stepOrder: 3, status: "waiting" }),
				expect.objectContaining({
					stepOrder: 4,
					status: "skipped",
					minimumInvoiceTotal: "10000.00",
					thresholdCurrency: "EUR",
				}),
			],
		});
	});

	it("includes senior approval at the exact threshold", async () => {
		mockRequireUser.mockResolvedValue({ id: "submitter-1" });
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			id: "case-1",
			organizationId: "org-1",
			siteId: "site-1",
			submittedByUserId: "submitter-1",
			status: "needs_review",
			approvalRound: 0,
			total: { toString: () => "10000" },
			currency: "EUR",
		});
		mockPrisma.tgemInvoiceApprovalTemplate.findFirst.mockResolvedValue(
			approvalTemplate(),
		);

		await submitTgemInvoiceForApproval({ invoiceCaseId: "case-1" });
		const data =
			mockPrisma.tgemInvoiceApprovalStep.createMany.mock.calls[0][0].data;
		expect(data[3]).toEqual(expect.objectContaining({ status: "waiting" }));
	});

	it("prevents a submitter from entering their own applicable approval chain", async () => {
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			id: "case-1",
			organizationId: "org-1",
			siteId: "site-1",
			submittedByUserId: "user-1",
			status: "needs_review",
			approvalRound: 0,
			total: { toString: () => "9000" },
			currency: "EUR",
		});
		mockPrisma.tgemInvoiceApprovalTemplate.findFirst.mockResolvedValue(
			approvalTemplate(),
		);

		await expect(
			submitTgemInvoiceForApproval({ invoiceCaseId: "case-1" }),
		).rejects.toThrow("submitter cannot approve");
		expect(
			mockPrisma.tgemInvoiceApprovalStep.createMany,
		).not.toHaveBeenCalled();
	});

	it("rejects a template containing an inactive approver", async () => {
		mockRequireUser.mockResolvedValue({ id: "submitter-1" });
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			id: "case-1",
			organizationId: "org-1",
			siteId: "site-1",
			submittedByUserId: "submitter-1",
			status: "needs_review",
			approvalRound: 0,
			total: { toString: () => "9000" },
			currency: "EUR",
		});
		const template = approvalTemplate();
		template.steps[1].approver.status = "inactive";
		mockPrisma.tgemInvoiceApprovalTemplate.findFirst.mockResolvedValue(
			template,
		);

		await expect(
			submitTgemInvoiceForApproval({ invoiceCaseId: "case-1" }),
		).rejects.toThrow("unavailable user");
	});

	it("allows only the current non-submitting approver and advances one step", async () => {
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			id: "case-1",
			organizationId: "org-1",
			submittedByUserId: "submitter-1",
			approvalRound: 1,
		});
		mockPrisma.tgemInvoiceApprovalStep.findFirst
			.mockResolvedValueOnce({ id: "step-1", stepOrder: 1 })
			.mockResolvedValueOnce({ id: "step-2", stepOrder: 2 });
		mockPrisma.tgemInvoiceApprovalStep.updateMany.mockResolvedValue({
			count: 1,
		});

		await decideTgemInvoiceApproval({
			invoiceCaseId: "case-1",
			decision: "approve",
		});

		expect(mockPrisma.tgemInvoiceApprovalStep.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: "step-1",
					status: "current",
					approverUserId: "user-1",
				}),
			}),
		);
		expect(mockPrisma.tgemInvoiceApprovalStep.update).toHaveBeenCalledWith({
			where: { id: "step-2" },
			data: { status: "current" },
		});
	});

	it("rejects a duplicate approval decision claimed by another request", async () => {
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			id: "case-1",
			organizationId: "org-1",
			submittedByUserId: "submitter-1",
			approvalRound: 1,
		});
		mockPrisma.tgemInvoiceApprovalStep.findFirst.mockResolvedValue({
			id: "step-1",
			stepOrder: 1,
		});
		mockPrisma.tgemInvoiceApprovalStep.updateMany.mockResolvedValue({
			count: 0,
		});

		await expect(
			decideTgemInvoiceApproval({
				invoiceCaseId: "case-1",
				decision: "approve",
			}),
		).rejects.toThrow("already been decided");
	});
});
