const mockRequireUser = jest.fn();
const mockCanAccessFlowConfigAdmin = jest.fn();
const mockPrisma = {
	flowAssignment: { findFirst: jest.fn() },
	organization: { findUnique: jest.fn() },
	site: { findFirst: jest.fn(), findUnique: jest.fn() },
	user: { findFirst: jest.fn() },
	tgemAccessGroup: {
		findFirst: jest.fn(),
		findMany: jest.fn(),
		create: jest.fn(),
		update: jest.fn(),
	},
	tgemOrganizationAccessMembership: {
		findMany: jest.fn(),
		deleteMany: jest.fn(),
		createMany: jest.fn(),
	},
	tgemSiteAccessMembership: {
		findMany: jest.fn(),
		deleteMany: jest.fn(),
		createMany: jest.fn(),
	},
	tgemAccessAuditEvent: { create: jest.fn(), createMany: jest.fn() },
	$transaction: jest.fn(),
};

jest.mock("next/headers", () => ({
	headers: async () => ({ get: () => "worksrecorded.com" }),
}));
jest.mock("@/lib/production-flow/config", () => ({
	canAccessFlowConfigAdmin: (...args: unknown[]) =>
		mockCanAccessFlowConfigAdmin(...args),
}));
jest.mock("@/lib/utils/db", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

import {
	getTgemAccessAdminData,
	getTgemSiteAccessData,
	saveTgemAccessGroup,
	saveTgemSiteAccessMemberships,
} from "./tgem-access-actions";

describe("TGEM access administration", () => {
	beforeEach(() => {
		jest.resetAllMocks();
		mockRequireUser.mockResolvedValue({ id: "actor-1" });
		mockPrisma.flowAssignment.findFirst.mockResolvedValue({
			organizationId: "org-1",
		});
		mockPrisma.$transaction.mockImplementation(
			(callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma),
		);
	});

	it("rejects admin data requests for non-TGEM organizations", async () => {
		mockCanAccessFlowConfigAdmin.mockReturnValue(true);
		mockPrisma.flowAssignment.findFirst.mockResolvedValue(null);

		await expect(getTgemAccessAdminData("org-other")).rejects.toThrow(
			"TGEM organization not found",
		);
		expect(mockPrisma.organization.findUnique).not.toHaveBeenCalled();
	});

	it("lets a platform admin create an audited allow-list group", async () => {
		mockCanAccessFlowConfigAdmin.mockReturnValue(true);
		mockPrisma.tgemAccessGroup.create.mockResolvedValue({
			id: "group-1",
			organizationId: "org-1",
			name: "Grāmatveži",
			permissions: ["invoice.mark_paid", "invoice.view"],
		});

		await expect(
			saveTgemAccessGroup({
				organizationId: "org-1",
				name: "Grāmatveži",
				permissions: ["invoice.view", "invoice.mark_paid", "invoice.view"],
			}),
		).resolves.toMatchObject({ id: "group-1" });
		expect(mockPrisma.tgemAccessAuditEvent.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				groupId: "group-1",
				eventType: "group_created",
				actorUserId: "actor-1",
			}),
		});
	});

	it("lets a platform admin load site access for a project they do not own", async () => {
		mockCanAccessFlowConfigAdmin.mockReturnValue(true);
		mockPrisma.site.findFirst.mockResolvedValue({
			id: "site-1",
			organizationId: "org-1",
			userId: "owner-2",
			organization: { users: [], tgemAccessGroups: [] },
		});

		await expect(getTgemSiteAccessData("site-1")).resolves.toMatchObject({
			id: "site-1",
			userId: "owner-2",
		});
	});

	it("lets a project owner replace site groups and audits additions and removals", async () => {
		mockCanAccessFlowConfigAdmin.mockReturnValue(false);
		mockPrisma.site.findUnique.mockResolvedValue({
			organizationId: "org-1",
			userId: "actor-1",
		});
		mockPrisma.user.findFirst.mockResolvedValue({ id: "member-1" });
		mockPrisma.tgemAccessGroup.findMany.mockResolvedValue([
			{ id: "group-new" },
		]);
		mockPrisma.tgemSiteAccessMembership.findMany.mockResolvedValue([
			{ groupId: "group-old" },
		]);

		await expect(
			saveTgemSiteAccessMemberships({
				siteId: "site-1",
				userId: "member-1",
				groupIds: ["group-new"],
			}),
		).resolves.toEqual({
			siteId: "site-1",
			userId: "member-1",
			groupIds: ["group-new"],
		});
		expect(mockPrisma.tgemAccessAuditEvent.createMany).toHaveBeenCalledWith({
			data: expect.arrayContaining([
				expect.objectContaining({ eventType: "site_membership_added" }),
				expect.objectContaining({ eventType: "site_membership_removed" }),
			]),
		});
	});

	it("does not give a non-owner site assignment authority", async () => {
		mockCanAccessFlowConfigAdmin.mockReturnValue(false);
		mockPrisma.site.findUnique.mockResolvedValue({
			organizationId: "org-1",
			userId: "owner-2",
		});
		await expect(
			saveTgemSiteAccessMemberships({
				siteId: "site-1",
				userId: "member-1",
				groupIds: [],
			}),
		).rejects.toThrow("project owner");
		expect(
			mockPrisma.tgemSiteAccessMembership.deleteMany,
		).not.toHaveBeenCalled();
	});

	it("rejects direct site mutations outside a TGEM organization", async () => {
		mockCanAccessFlowConfigAdmin.mockReturnValue(true);
		mockPrisma.site.findUnique.mockResolvedValue({
			organizationId: "org-other",
			userId: "owner-2",
		});
		mockPrisma.flowAssignment.findFirst.mockResolvedValue(null);

		await expect(
			saveTgemSiteAccessMemberships({
				siteId: "site-1",
				userId: "member-1",
				groupIds: [],
			}),
		).rejects.toThrow("TGEM organization not found");
		expect(mockPrisma.tgemSiteAccessMembership.findMany).not.toHaveBeenCalled();
	});
});
