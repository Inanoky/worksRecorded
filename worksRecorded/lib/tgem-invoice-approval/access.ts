import type { Prisma, PrismaClient } from "@prisma/client";
import {
	normalizeTgemPermissions,
	TGEM_ADMINISTRATOR_PERMISSIONS,
	TGEM_APPROVER_PERMISSIONS,
	TGEM_BASIC_MEMBER_PERMISSIONS,
	type TgemPermission,
} from "@/lib/tgem-invoice-approval/permissions";

type TgemAccessDb = PrismaClient | Prisma.TransactionClient;

export type TgemAccessScope = {
	organizationId: string;
	userId: string;
	organizationPermissions: Set<TgemPermission>;
	sitePermissions: Map<string, Set<TgemPermission>>;
};

function unionPermissions(groups: Array<{ permissions: string[] }>) {
	return new Set<TgemPermission>(
		normalizeTgemPermissions(groups.flatMap((group) => group.permissions)),
	);
}

export async function loadTgemAccessScope(
	db: TgemAccessDb,
	input: { userId: string; organizationId: string },
): Promise<TgemAccessScope | null> {
	const user = await db.user.findFirst({
		where: {
			id: input.userId,
			organizationId: input.organizationId,
			status: "active",
		},
		select: { id: true },
	});
	if (!user) return null;

	const [organizationMemberships, siteMemberships] = await Promise.all([
		db.tgemOrganizationAccessMembership.findMany({
			where: {
				userId: input.userId,
				group: { organizationId: input.organizationId },
			},
			select: { group: { select: { permissions: true } } },
		}),
		db.tgemSiteAccessMembership.findMany({
			where: {
				userId: input.userId,
				group: { organizationId: input.organizationId },
				site: { organizationId: input.organizationId },
			},
			select: {
				siteId: true,
				group: { select: { permissions: true } },
			},
		}),
	]);

	const groupsBySite = new Map<string, Array<{ permissions: string[] }>>();
	for (const membership of siteMemberships) {
		const groups = groupsBySite.get(membership.siteId) ?? [];
		groups.push(membership.group);
		groupsBySite.set(membership.siteId, groups);
	}

	return {
		organizationId: input.organizationId,
		userId: input.userId,
		organizationPermissions: unionPermissions(
			organizationMemberships.map((membership) => membership.group),
		),
		sitePermissions: new Map(
			Array.from(groupsBySite, ([siteId, groups]) => [
				siteId,
				unionPermissions(groups),
			]),
		),
	};
}

export function getTgemPermissionsForSite(
	scope: TgemAccessScope,
	siteId: string | null,
) {
	if (!siteId) return scope.organizationPermissions;
	return scope.sitePermissions.get(siteId) ?? scope.organizationPermissions;
}

export function canTgem(
	scope: TgemAccessScope,
	siteId: string | null,
	permission: TgemPermission,
) {
	return getTgemPermissionsForSite(scope, siteId).has(permission);
}

export async function requireTgemPermission(
	db: TgemAccessDb,
	input: {
		userId: string;
		organizationId: string;
		siteId: string | null;
		permission: TgemPermission;
	},
) {
	const scope = await loadTgemAccessScope(db, input);
	if (!scope || !canTgem(scope, input.siteId, input.permission)) {
		throw new Error("TGEM permission denied");
	}
	return scope;
}

export function visibleTgemSiteIds(
	scope: TgemAccessScope,
	siteIds: readonly string[],
) {
	return siteIds.filter((siteId) => canTgem(scope, siteId, "invoice.view"));
}

export function visibleTgemSites<T extends { id: string }>(
	scope: TgemAccessScope,
	sites: readonly T[],
) {
	return sites.filter((site) => canTgem(scope, site.id, "invoice.view"));
}

export async function isTgemAccessOrganization(
	db: TgemAccessDb,
	organizationId: string,
) {
	const assignment = await db.flowAssignment.findFirst({
		where: {
			organizationId,
			flowModuleKey: "tgem-invoice-approval",
			enabled: true,
		},
		select: { organizationId: true },
	});
	return Boolean(assignment);
}

export async function ensureTgemAccessDefaults(
	db: TgemAccessDb,
	input: {
		organizationId: string;
		actorUserId: string;
		userIds?: string[];
	},
) {
	if (!(await isTgemAccessOrganization(db, input.organizationId))) return null;

	const defaults = [
		{ name: "Basic member", permissions: [...TGEM_BASIC_MEMBER_PERMISSIONS] },
		{ name: "Approver", permissions: [...TGEM_APPROVER_PERMISSIONS] },
		{
			name: "Administrator",
			permissions: [...TGEM_ADMINISTRATOR_PERMISSIONS],
		},
	];
	const existingGroups = await db.tgemAccessGroup.findMany({
		where: {
			organizationId: input.organizationId,
			name: { in: defaults.map((group) => group.name) },
		},
		select: { id: true, name: true },
	});
	const groups = [...existingGroups];
	const createdGroupIds: string[] = [];
	for (const definition of defaults) {
		if (groups.some((group) => group.name === definition.name)) continue;
		const created = await db.tgemAccessGroup.create({
			data: {
				organizationId: input.organizationId,
				name: definition.name,
				permissions: definition.permissions,
				createdByUserId: input.actorUserId,
			},
			select: { id: true, name: true },
		});
		groups.push(created);
		createdGroupIds.push(created.id);
		await db.tgemAccessAuditEvent.create({
			data: {
				organizationId: input.organizationId,
				groupId: created.id,
				actorUserId: input.actorUserId,
				eventType: "group_created",
				payload: {
					source: "automatic_provisioning",
					name: definition.name,
					permissions: definition.permissions,
				},
			},
		});
	}
	const basicGroup = groups.find((group) => group.name === "Basic member");
	if (!basicGroup) throw new Error("Could not provision TGEM basic access");
	const users = await db.user.findMany({
		where: {
			organizationId: input.organizationId,
			status: "active",
			...(input.userIds ? { id: { in: input.userIds } } : {}),
		},
		select: { id: true },
	});
	const existingMemberships = users.length
		? await db.tgemOrganizationAccessMembership.findMany({
				where: {
					groupId: basicGroup.id,
					userId: { in: users.map((user) => user.id) },
				},
				select: { userId: true },
			})
		: [];
	const existingUserIds = new Set(
		existingMemberships.map((membership) => membership.userId),
	);
	const addedMembershipUserIds = users
		.map((user) => user.id)
		.filter((userId) => !existingUserIds.has(userId));
	if (addedMembershipUserIds.length) {
		await db.tgemOrganizationAccessMembership.createMany({
			data: addedMembershipUserIds.map((userId) => ({
				groupId: basicGroup.id,
				userId,
				createdByUserId: input.actorUserId,
			})),
		});
		await db.tgemAccessAuditEvent.createMany({
			data: addedMembershipUserIds.map((userId) => ({
				organizationId: input.organizationId,
				groupId: basicGroup.id,
				targetUserId: userId,
				actorUserId: input.actorUserId,
				eventType: "organization_membership_added",
				payload: { source: "automatic_provisioning" },
			})),
		});
	}
	return {
		groups,
		userIds: users.map((user) => user.id),
		createdGroupIds,
		addedMembershipUserIds,
	};
}

export async function removeTgemUserAccessForOrganization(
	db: TgemAccessDb,
	input: {
		organizationId: string;
		userId: string;
		actorUserId: string;
	},
) {
	const [organizationMemberships, siteMemberships] = await Promise.all([
		db.tgemOrganizationAccessMembership.findMany({
			where: {
				userId: input.userId,
				group: { organizationId: input.organizationId },
			},
			select: { groupId: true },
		}),
		db.tgemSiteAccessMembership.findMany({
			where: {
				userId: input.userId,
				group: { organizationId: input.organizationId },
			},
			select: { groupId: true, siteId: true },
		}),
	]);

	if (siteMemberships.length) {
		await db.tgemSiteAccessMembership.deleteMany({
			where: {
				userId: input.userId,
				group: { organizationId: input.organizationId },
			},
		});
	}
	if (organizationMemberships.length) {
		await db.tgemOrganizationAccessMembership.deleteMany({
			where: {
				userId: input.userId,
				group: { organizationId: input.organizationId },
			},
		});
	}

	const events = [
		...organizationMemberships.map((membership) => ({
			organizationId: input.organizationId,
			groupId: membership.groupId,
			targetUserId: input.userId,
			actorUserId: input.actorUserId,
			eventType: "organization_membership_removed",
			payload: { source: "organization_switch" },
		})),
		...siteMemberships.map((membership) => ({
			organizationId: input.organizationId,
			groupId: membership.groupId,
			siteId: membership.siteId,
			targetUserId: input.userId,
			actorUserId: input.actorUserId,
			eventType: "site_membership_removed",
			payload: { source: "organization_switch" },
		})),
	];
	if (events.length) {
		await db.tgemAccessAuditEvent.createMany({ data: events });
	}

	return {
		organizationMembershipsRemoved: organizationMemberships.length,
		siteMembershipsRemoved: siteMemberships.length,
	};
}
