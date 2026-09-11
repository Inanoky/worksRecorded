const mockRequireUser = jest.fn();
const mockPrisma = {
	site: { findFirst: jest.fn() },
	tgemInvoiceCase: { findMany: jest.fn() },
	user: { findMany: jest.fn() },
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

import { getTgemInvoiceDashboardData } from "@/server/actions/tgem-invoice-actions";

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

	it("returns read-only approval setup for an ordinary active member", async () => {
		mockPrisma.site.findFirst.mockResolvedValue({
			id: "site-1",
			organizationId: "org-1",
			userId: "owner-1",
			tgemInvoiceWorkflowManagers: [],
		});

		const result = await getTgemInvoiceDashboardData("site-1");

		expect(result?.approvalSetup).toEqual(
			expect.objectContaining({
				canManageWorkflow: false,
				canManageWorkflowManagers: false,
			}),
		);
	});

	it("lets the Buvconsult superuser view another organization's TGEM dashboard read-only", async () => {
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
			expect.objectContaining({ where: { id: "site-1" } }),
		);
		expect(result?.approvalSetup).toEqual(
			expect.objectContaining({
				canManageWorkflow: false,
				canManageWorkflowManagers: false,
			}),
		);
	});
});
