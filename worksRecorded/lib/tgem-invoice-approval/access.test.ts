import type { PrismaClient } from "@prisma/client";
import {
	canTgem,
	ensureTgemAccessDefaults,
	getTgemPermissionsForSite,
	loadTgemAccessScope,
	removeTgemUserAccessForOrganization,
	visibleTgemSiteIds,
	visibleTgemSites,
} from "./access";

function mockDb(input?: {
	active?: boolean;
	organizationGroups?: string[][];
	siteGroups?: Array<{ siteId: string; permissions: string[] }>;
}) {
	return {
		user: {
			findFirst: jest
				.fn()
				.mockResolvedValue(input?.active === false ? null : { id: "user-1" }),
		},
		tgemOrganizationAccessMembership: {
			findMany: jest.fn().mockResolvedValue(
				(input?.organizationGroups ?? []).map((permissions) => ({
					group: { permissions },
				})),
			),
		},
		tgemSiteAccessMembership: {
			findMany: jest.fn().mockResolvedValue(
				(input?.siteGroups ?? []).map((membership) => ({
					siteId: membership.siteId,
					group: { permissions: membership.permissions },
				})),
			),
		},
	} as unknown as PrismaClient;
}

describe("TGEM access resolver", () => {
	it("uses organization permissions when a site has no override", async () => {
		const scope = await loadTgemAccessScope(
			mockDb({ organizationGroups: [["invoice.view", "invoice.edit_basic"]] }),
			{ organizationId: "org-1", userId: "user-1" },
		);
		expect(scope).not.toBeNull();
		if (!scope) throw new Error("Expected access scope");
		expect(canTgem(scope, "site-1", "invoice.view")).toBe(true);
		expect(canTgem(scope, "site-1", "invoice.archive")).toBe(false);
	});

	it("removes hidden TGEM projects from shared dashboard navigation data", async () => {
		const scope = await loadTgemAccessScope(
			mockDb({
				organizationGroups: [["invoice.view"]],
				siteGroups: [
					{ siteId: "site-hidden", permissions: ["invoice.approve"] },
				],
			}),
			{ organizationId: "org-1", userId: "user-1" },
		);
		if (!scope) throw new Error("Expected access scope");

		expect(
			visibleTgemSites(scope, [
				{ id: "site-visible", name: "Visible project" },
				{ id: "site-hidden", name: "Hidden project" },
			]),
		).toEqual([{ id: "site-visible", name: "Visible project" }]);
	});

	it("replaces organization permissions with the union of site groups", async () => {
		const scope = await loadTgemAccessScope(
			mockDb({
				organizationGroups: [["invoice.view", "invoice.archive"]],
				siteGroups: [
					{ siteId: "site-1", permissions: ["invoice.view"] },
					{ siteId: "site-1", permissions: ["invoice.approve"] },
				],
			}),
			{ organizationId: "org-1", userId: "user-1" },
		);
		if (!scope) throw new Error("Expected access scope");
		expect(getTgemPermissionsForSite(scope, "site-1")).toEqual(
			new Set(["invoice.approve", "invoice.view"]),
		);
		expect(canTgem(scope, "site-1", "invoice.archive")).toBe(false);
		expect(canTgem(scope, null, "invoice.archive")).toBe(true);
	});

	it("filters site visibility using each effective scope", async () => {
		const scope = await loadTgemAccessScope(
			mockDb({
				organizationGroups: [["invoice.view"]],
				siteGroups: [
					{ siteId: "site-hidden", permissions: ["invoice.approve"] },
				],
			}),
			{ organizationId: "org-1", userId: "user-1" },
		);
		if (!scope) throw new Error("Expected access scope");
		expect(visibleTgemSiteIds(scope, ["site-visible", "site-hidden"])).toEqual([
			"site-visible",
		]);
	});

	it("rejects inactive or cross-organization users before loading memberships", async () => {
		const db = mockDb({ active: false });
		await expect(
			loadTgemAccessScope(db, { organizationId: "org-2", userId: "user-1" }),
		).resolves.toBeNull();
		expect(db.tgemOrganizationAccessMembership.findMany).not.toHaveBeenCalled();
	});
});

function provisioningDb(input?: {
	tgem?: boolean;
	groups?: Array<{ id: string; name: string }>;
	membershipUserIds?: string[];
}) {
	let groupSequence = 0;
	return {
		flowAssignment: {
			findFirst: jest
				.fn()
				.mockResolvedValue(
					input?.tgem === false ? null : { organizationId: "org-1" },
				),
		},
		tgemAccessGroup: {
			findMany: jest.fn().mockResolvedValue(input?.groups ?? []),
			create: jest.fn().mockImplementation(({ data }) => ({
				id: `group-${++groupSequence}`,
				name: data.name,
			})),
		},
		user: {
			findMany: jest.fn().mockResolvedValue([{ id: "user-1" }]),
		},
		tgemOrganizationAccessMembership: {
			findMany: jest
				.fn()
				.mockResolvedValue(
					(input?.membershipUserIds ?? []).map((userId) => ({ userId })),
				),
			createMany: jest.fn().mockResolvedValue({ count: 1 }),
			deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
		},
		tgemSiteAccessMembership: {
			findMany: jest.fn().mockResolvedValue([]),
			deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
		},
		tgemAccessAuditEvent: {
			create: jest.fn().mockResolvedValue({ id: "audit-1" }),
			createMany: jest.fn().mockResolvedValue({ count: 1 }),
		},
	} as unknown as PrismaClient;
}

describe("TGEM access provisioning", () => {
	it("does not provision a non-TGEM organization", async () => {
		const db = provisioningDb({ tgem: false });

		await expect(
			ensureTgemAccessDefaults(db, {
				organizationId: "org-1",
				actorUserId: "actor-1",
			}),
		).resolves.toBeNull();
		expect(db.tgemAccessGroup.findMany).not.toHaveBeenCalled();
		expect(db.tgemAccessAuditEvent.create).not.toHaveBeenCalled();
	});

	it("audits newly provisioned groups and basic membership", async () => {
		const db = provisioningDb();

		await expect(
			ensureTgemAccessDefaults(db, {
				organizationId: "org-1",
				actorUserId: "actor-1",
				userIds: ["user-1"],
			}),
		).resolves.toMatchObject({
			createdGroupIds: ["group-1", "group-2", "group-3"],
			addedMembershipUserIds: ["user-1"],
		});
		expect(db.tgemAccessAuditEvent.create).toHaveBeenCalledTimes(3);
		expect(db.tgemAccessAuditEvent.createMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({
					eventType: "organization_membership_added",
					targetUserId: "user-1",
				}),
			],
		});
	});

	it("does not duplicate audit events for existing defaults", async () => {
		const db = provisioningDb({
			groups: [
				{ id: "basic", name: "Basic member" },
				{ id: "approver", name: "Approver" },
				{ id: "admin", name: "Administrator" },
			],
			membershipUserIds: ["user-1"],
		});

		await ensureTgemAccessDefaults(db, {
			organizationId: "org-1",
			actorUserId: "actor-1",
			userIds: ["user-1"],
		});

		expect(db.tgemAccessGroup.create).not.toHaveBeenCalled();
		expect(
			db.tgemOrganizationAccessMembership.createMany,
		).not.toHaveBeenCalled();
		expect(db.tgemAccessAuditEvent.create).not.toHaveBeenCalled();
		expect(db.tgemAccessAuditEvent.createMany).not.toHaveBeenCalled();
	});

	it("removes and audits old organization and site memberships", async () => {
		const db = provisioningDb();
		jest
			.mocked(db.tgemOrganizationAccessMembership.findMany)
			.mockResolvedValue([{ groupId: "group-org" }] as never);
		jest
			.mocked(db.tgemSiteAccessMembership.findMany)
			.mockResolvedValue([
				{ groupId: "group-site", siteId: "site-1" },
			] as never);

		await expect(
			removeTgemUserAccessForOrganization(db, {
				organizationId: "old-org",
				userId: "user-1",
				actorUserId: "actor-1",
			}),
		).resolves.toEqual({
			organizationMembershipsRemoved: 1,
			siteMembershipsRemoved: 1,
		});
		expect(db.tgemAccessAuditEvent.createMany).toHaveBeenCalledWith({
			data: expect.arrayContaining([
				expect.objectContaining({
					eventType: "organization_membership_removed",
				}),
				expect.objectContaining({ eventType: "site_membership_removed" }),
			]),
		});
	});
});
