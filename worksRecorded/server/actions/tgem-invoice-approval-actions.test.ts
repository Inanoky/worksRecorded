const mockRequireUser = jest.fn();
const mockPrisma = {
	site: { findFirst: jest.fn() },
	user: { findMany: jest.fn() },
	tgemInvoiceCase: {
		findFirst: jest.fn(),
		findMany: jest.fn(),
		update: jest.fn(),
		updateMany: jest.fn(),
	},
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
		findMany: jest.fn(),
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

import { startTgemInvoiceApproval } from "@/lib/tgem-invoice-approval/start-approval";
import {
	assignTgemInvoiceProject,
	decideTgemInvoiceApproval,
	getTgemApprovalSetupData,
	markTgemInvoicePaid,
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
		name: "Riga office",
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
		mockPrisma.tgemInvoiceCase.findMany.mockResolvedValue([]);
		mockPrisma.tgemInvoiceCase.updateMany.mockResolvedValue({ count: 1 });
	});

	it("loads settings for an authorized project without reading invoices", async () => {
		mockSiteAccess({ ownerUserId: "owner-1" });
		mockPrisma.user.findMany.mockResolvedValue([
			{ id: "user-1", firstName: "Anna", lastName: "Bērziņa", role: null },
		]);
		mockPrisma.tgemInvoiceApprovalTemplate.findFirst.mockResolvedValue(null);
		mockPrisma.tgemInvoiceWorkflowManager.findMany.mockResolvedValue([]);

		const result = await getTgemApprovalSetupData("site-1");
		expect(result.project).toEqual({ id: "site-1", name: "Riga office" });
		expect(result.setup).toEqual(
			expect.objectContaining({
				canManageWorkflow: true,
				canManageWorkflowManagers: false,
				template: null,
				users: [{ id: "user-1", name: "Anna Bērziņa", role: null }],
			}),
		);
		expect(mockPrisma.tgemInvoiceCase.findMany).not.toHaveBeenCalled();
	});

	it("rejects settings access when the user cannot access the project", async () => {
		mockPrisma.site.findFirst.mockResolvedValue(null);
		await expect(getTgemApprovalSetupData("foreign-site")).rejects.toThrow(
			"Project access denied",
		);
		expect(
			mockPrisma.tgemInvoiceWorkflowManager.findMany,
		).not.toHaveBeenCalled();
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
					roleLabel: "Finanšu direktors",
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
								role: "Finanšu direktors",
							}),
						],
					},
				}),
			}),
		);
	});

	it("lets an active organization member save the ordered flow", async () => {
		mockSiteAccess({ ownerUserId: "owner-1" });
		mockPrisma.user.findMany.mockResolvedValue([{ id: "user-2" }]);
		mockPrisma.tgemInvoiceApprovalTemplate.findFirst.mockResolvedValue(null);
		mockPrisma.tgemInvoiceApprovalTemplate.create.mockResolvedValue({
			id: "template-1",
		});

		await expect(
			saveTgemApprovalTemplate({
				siteId: "site-1",
				steps: [
					{
						approverUserId: "user-2",
						roleKey: "project_review",
						roleLabel: "Projekta vadītājs",
					},
				],
			}),
		).resolves.toEqual({ id: "template-1" });
	});

	it("does not auto-submit review-ready invoices when a sequence is saved", async () => {
		mockSiteAccess();
		mockPrisma.user.findMany.mockResolvedValue([{ id: "user-1" }]);
		mockPrisma.tgemInvoiceApprovalTemplate.findFirst.mockResolvedValueOnce(
			null,
		);
		mockPrisma.tgemInvoiceApprovalTemplate.create.mockResolvedValue({
			id: "template-1",
		});
		await saveTgemApprovalTemplate({
			siteId: "site-1",
			steps: [
				{
					approverUserId: "user-1",
					roleKey: "project_review",
					roleLabel: "Darba vadītājs",
				},
			],
		});

		expect(mockPrisma.tgemInvoiceCase.findMany).not.toHaveBeenCalled();
		expect(
			mockPrisma.tgemInvoiceApprovalStep.createMany,
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
				steps: [
					{
						approverUserId: "user-2",
						roleKey: "budget_approval",
						roleLabel: "Finanšu direktors",
					},
				],
			}),
		).resolves.toEqual({ id: "template-1" });
		await expect(
			saveTgemWorkflowManagers({ siteId: "site-1", userIds: ["user-2"] }),
		).rejects.toThrow("project owner");
	});

	it.each([undefined, "", "Commercial manager"])(
		"rejects missing or unsupported roles before changing a template: %s",
		async (roleLabel) => {
			mockSiteAccess();
			await expect(
				saveTgemApprovalTemplate({
					siteId: "site-1",
					steps: [
						{
							approverUserId: "user-2",
							roleKey: "financial_review",
							roleLabel,
						},
					],
				}),
			).rejects.toThrow("jāizvēlas loma");
			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
			expect(
				mockPrisma.tgemInvoiceApprovalTemplate.updateMany,
			).not.toHaveBeenCalled();
		},
	);

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

	it("snapshots every configured person in one explicit sequence", async () => {
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
					status: "waiting",
					minimumInvoiceTotal: "10000.00",
					thresholdCurrency: "EUR",
				}),
			],
		});
		expect(mockPrisma.tgemInvoiceAuditEvent.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				eventType: "invoice_submitted_for_approval",
				payload: expect.objectContaining({
					currentApproverUserId: "user-1",
					finalApproverUserId: "user-4",
					approvalRoute: expect.arrayContaining([
						expect.objectContaining({
							stepOrder: 1,
							approverName: "Anna Bērziņa",
						}),
					]),
				}),
			}),
		});
	});

	it("automatically assigns the invoice to the first configured approver", async () => {
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			id: "case-1",
			organizationId: "org-1",
			siteId: "site-1",
			status: "needs_review",
			approvalRound: 0,
		});
		mockPrisma.tgemInvoiceApprovalTemplate.findFirst.mockResolvedValue(
			approvalTemplate(),
		);

		await expect(
			startTgemInvoiceApproval({
				invoiceCaseId: "case-1",
				actorUserId: "user-1",
				trigger: "automatic",
			}),
		).resolves.toEqual({
			invoiceCaseId: "case-1",
			approvalRound: 1,
			currentApproverUserId: "user-1",
			finalApproverUserId: "user-4",
		});
		expect(mockPrisma.tgemInvoiceApprovalStep.createMany).toHaveBeenCalledWith({
			data: expect.arrayContaining([
				expect.objectContaining({
					stepOrder: 1,
					approverUserId: "user-1",
					status: "current",
				}),
			]),
		});
		expect(mockPrisma.tgemInvoiceAuditEvent.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				actorType: "system",
				eventType: "invoice_approval_auto_started",
				fromStatus: "needs_review",
				toStatus: "in_approval",
				payload: expect.objectContaining({
					trigger: "automatic",
					currentApproverUserId: "user-1",
				}),
			}),
		});
	});

	it("marks only an approved invoice as paid and audits the payment", async () => {
		const updatedAt = new Date("2026-09-24T16:00:00.000Z");
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			id: "case-1",
			organizationId: "org-1",
			status: "approved",
			paymentStatus: "unpaid",
			updatedAt,
		});
		mockPrisma.tgemInvoiceCase.updateMany.mockResolvedValue({ count: 1 });

		await expect(
			markTgemInvoicePaid({
				invoiceCaseId: "case-1",
				expectedUpdatedAt: updatedAt.toISOString(),
			}),
		).resolves.toEqual(
			expect.objectContaining({
				invoiceCaseId: "case-1",
				unchanged: false,
				paidAt: expect.any(String),
			}),
		);
		expect(mockPrisma.tgemInvoiceCase.updateMany).toHaveBeenCalledWith({
			where: {
				id: "case-1",
				updatedAt,
				status: "approved",
				paymentStatus: "unpaid",
			},
			data: { paymentStatus: "paid", paidAt: expect.any(Date) },
		});
		expect(mockPrisma.tgemInvoiceAuditEvent.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				eventType: "invoice_marked_paid",
				fromStatus: "approved",
				toStatus: "approved",
				payload: expect.objectContaining({
					previousPaymentStatus: "unpaid",
					paymentStatus: "paid",
				}),
			}),
		});
	});

	it("rejects payment before approval", async () => {
		const updatedAt = new Date("2026-09-24T16:00:00.000Z");
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			id: "case-1",
			organizationId: "org-1",
			status: "in_approval",
			paymentStatus: "unpaid",
			updatedAt,
		});

		await expect(
			markTgemInvoicePaid({
				invoiceCaseId: "case-1",
				expectedUpdatedAt: updatedAt.toISOString(),
			}),
		).rejects.toThrow("Only an approved invoice");
		expect(mockPrisma.tgemInvoiceCase.updateMany).not.toHaveBeenCalled();
	});

	it("does not snapshot approvers after the invoice project changes", async () => {
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			id: "case-1",
			organizationId: "org-1",
			siteId: "site-1",
			status: "needs_review",
			approvalRound: 0,
		});
		mockPrisma.tgemInvoiceApprovalTemplate.findFirst.mockResolvedValue(
			approvalTemplate(),
		);
		mockPrisma.tgemInvoiceCase.updateMany.mockResolvedValue({ count: 0 });

		await expect(
			startTgemInvoiceApproval({
				invoiceCaseId: "case-1",
				actorUserId: "user-1",
				trigger: "automatic",
			}),
		).rejects.toThrow("project or approval status changed");
		expect(
			mockPrisma.tgemInvoiceApprovalStep.createMany,
		).not.toHaveBeenCalled();
	});

	it("reassigns an active invoice and invalidates only its unfinished route", async () => {
		const updatedAt = new Date("2026-09-15T09:00:00.000Z");
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			id: "case-1",
			organizationId: "org-1",
			siteId: "site-1",
			status: "in_approval",
			approvalRound: 2,
			updatedAt,
			site: { id: "site-1", name: "Riga office" },
		});
		mockPrisma.site.findFirst.mockResolvedValue({
			id: "site-2",
			name: "Jurmala warehouse",
		});
		mockPrisma.tgemInvoiceApprovalStep.updateMany.mockResolvedValue({
			count: 2,
		});

		await expect(
			assignTgemInvoiceProject({
				invoiceCaseId: "case-1",
				projectId: "site-2",
				expectedUpdatedAt: updatedAt.toISOString(),
			}),
		).resolves.toEqual({
			invoiceCaseId: "case-1",
			project: { id: "site-2", name: "Jurmala warehouse" },
			status: "needs_review",
			unchanged: false,
		});
		expect(mockPrisma.tgemInvoiceCase.updateMany).toHaveBeenCalledWith({
			where: { id: "case-1", updatedAt },
			data: {
				siteId: "site-2",
				status: "needs_review",
				approvedAt: null,
			},
		});
		expect(mockPrisma.tgemInvoiceApprovalStep.updateMany).toHaveBeenCalledWith({
			where: {
				invoiceCaseId: "case-1",
				approvalRound: 2,
				status: { in: ["current", "waiting"] },
			},
			data: { status: "cancelled" },
		});
		expect(mockPrisma.tgemInvoiceAuditEvent.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				eventType: "invoice_project_reassigned",
				fromStatus: "in_approval",
				toStatus: "needs_review",
				payload: expect.objectContaining({ invalidatedApprovalRound: 2 }),
			}),
		});
	});

	it.each([
		["received", "received", false],
		["processing", "processing", false],
		["failed_processing", "failed_processing", false],
		["needs_review", "needs_review", false],
		["changes_requested", "needs_review", true],
		["approved", "needs_review", true],
		["rejected", "needs_review", true],
	] as const)(
		"moves a %s invoice to %s when its project changes",
		async (currentStatus, nextStatus, clearsApproval) => {
			const updatedAt = new Date("2026-09-15T09:00:00.000Z");
			mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
				id: "case-1",
				organizationId: "org-1",
				siteId: "site-1",
				status: currentStatus,
				approvalRound: 1,
				updatedAt,
				site: { id: "site-1", name: "Riga office" },
			});
			mockPrisma.site.findFirst.mockResolvedValue({
				id: "site-2",
				name: "Jurmala warehouse",
			});
			mockPrisma.tgemInvoiceApprovalStep.updateMany.mockResolvedValue({
				count: 0,
			});

			await assignTgemInvoiceProject({
				invoiceCaseId: "case-1",
				projectId: "site-2",
				expectedUpdatedAt: updatedAt.toISOString(),
			});

			expect(mockPrisma.tgemInvoiceCase.updateMany).toHaveBeenCalledWith({
				where: { id: "case-1", updatedAt },
				data: {
					siteId: "site-2",
					status: nextStatus,
					...(clearsApproval ? { approvedAt: null } : {}),
				},
			});
		},
	);

	it("records the first project assignment", async () => {
		const updatedAt = new Date("2026-09-15T09:00:00.000Z");
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			id: "case-1",
			organizationId: "org-1",
			siteId: null,
			status: "needs_review",
			approvalRound: 0,
			updatedAt,
			site: null,
		});
		mockPrisma.site.findFirst.mockResolvedValue({
			id: "site-2",
			name: "Jurmala warehouse",
		});

		await assignTgemInvoiceProject({
			invoiceCaseId: "case-1",
			projectId: "site-2",
			expectedUpdatedAt: updatedAt.toISOString(),
		});

		expect(mockPrisma.tgemInvoiceAuditEvent.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				eventType: "invoice_project_assigned",
			}),
		});
	});

	it("rejects project assignment when the invoice version is stale", async () => {
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			id: "case-1",
			organizationId: "org-1",
			siteId: null,
			status: "needs_review",
			approvalRound: 0,
			updatedAt: new Date("2026-09-15T10:00:00.000Z"),
			site: null,
		});

		await expect(
			assignTgemInvoiceProject({
				invoiceCaseId: "case-1",
				projectId: "site-2",
				expectedUpdatedAt: "2026-09-15T09:00:00.000Z",
			}),
		).rejects.toThrow("invoice changed");
		expect(mockPrisma.site.findFirst).not.toHaveBeenCalled();
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

	it("allows the submitter to complete an assigned approval step", async () => {
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
		).resolves.toEqual({ invoiceCaseId: "case-1", approvalRound: 1 });
		expect(mockPrisma.tgemInvoiceApprovalStep.createMany).toHaveBeenCalled();
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

	it("allows only the current approver and advances one step", async () => {
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			id: "case-1",
			organizationId: "org-1",
			submittedByUserId: "user-1",
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

	it("marks later steps as not reached when changes are requested", async () => {
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			id: "case-1",
			organizationId: "org-1",
			submittedByUserId: "user-1",
			approvalRound: 2,
		});
		mockPrisma.tgemInvoiceApprovalStep.findFirst.mockResolvedValue({
			id: "step-1",
			stepOrder: 1,
		});
		mockPrisma.tgemInvoiceApprovalStep.updateMany
			.mockResolvedValueOnce({ count: 1 })
			.mockResolvedValueOnce({ count: 2 });

		await decideTgemInvoiceApproval({
			invoiceCaseId: "case-1",
			decision: "request_changes",
			comment: "Correct extracted prices",
		});

		expect(
			mockPrisma.tgemInvoiceApprovalStep.updateMany,
		).toHaveBeenLastCalledWith({
			where: {
				invoiceCaseId: "case-1",
				approvalRound: 2,
				status: "waiting",
				stepOrder: { gt: 1 },
			},
			data: { status: "cancelled" },
		});
		expect(mockPrisma.tgemInvoiceCase.update).toHaveBeenCalledWith({
			where: { id: "case-1" },
			data: { status: "changes_requested" },
		});
	});
});
