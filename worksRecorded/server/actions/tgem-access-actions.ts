"use server";

import type { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { z } from "zod";
import { canAccessFlowConfigAdmin } from "@/lib/production-flow/config";
import { isTgemAccessOrganization } from "@/lib/tgem-invoice-approval/access";
import {
	normalizeTgemPermissions,
	TGEM_PERMISSIONS,
} from "@/lib/tgem-invoice-approval/permissions";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

const groupInputSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		id: z.string().trim().min(1).optional(),
		name: z.string().trim().min(1).max(120),
		permissions: z.array(z.enum(TGEM_PERMISSIONS)).max(TGEM_PERMISSIONS.length),
	})
	.strict();

const membershipInputSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		userId: z.string().trim().min(1),
		groupIds: z.array(z.string().trim().min(1)).max(100),
	})
	.strict();

async function isPlatformAdmin(userId: string) {
	const requestHeaders = await headers();
	return canAccessFlowConfigAdmin(
		userId,
		requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
	);
}

async function requirePlatformAdmin() {
	const user = await requireUser();
	if (!(await isPlatformAdmin(user.id))) throw new Error("Access denied");
	return user;
}

async function writeMembershipAudit(
	tx: Prisma.TransactionClient,
	input: {
		organizationId: string;
		actorUserId: string;
		targetUserId: string;
		siteId?: string;
		addedGroupIds: string[];
		removedGroupIds: string[];
	},
) {
	const events = [
		...input.addedGroupIds.map((groupId) => ({
			organizationId: input.organizationId,
			groupId,
			siteId: input.siteId,
			targetUserId: input.targetUserId,
			actorUserId: input.actorUserId,
			eventType: input.siteId
				? "site_membership_added"
				: "organization_membership_added",
		})),
		...input.removedGroupIds.map((groupId) => ({
			organizationId: input.organizationId,
			groupId,
			siteId: input.siteId,
			targetUserId: input.targetUserId,
			actorUserId: input.actorUserId,
			eventType: input.siteId
				? "site_membership_removed"
				: "organization_membership_removed",
		})),
	];
	if (events.length) await tx.tgemAccessAuditEvent.createMany({ data: events });
}

export async function getTgemAccessAdminData(organizationId: string) {
	await requirePlatformAdmin();
	if (!(await isTgemAccessOrganization(prisma, organizationId))) {
		throw new Error("TGEM organization not found");
	}
	const organization = await prisma.organization.findUnique({
		where: { id: organizationId },
		select: {
			id: true,
			name: true,
			users: {
				where: { status: "active" },
				orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
				select: { id: true, firstName: true, lastName: true, email: true },
			},
			tgemAccessGroups: {
				orderBy: { name: "asc" },
				include: {
					organizationMemberships: { select: { userId: true } },
				},
			},
		},
	});
	if (!organization) throw new Error("Organization not found");
	return organization;
}

export async function saveTgemAccessGroup(
	input: z.infer<typeof groupInputSchema>,
) {
	const actor = await requirePlatformAdmin();
	const parsed = groupInputSchema.parse(input);
	const permissions = normalizeTgemPermissions(parsed.permissions);
	return prisma.$transaction(async (tx) => {
		if (!(await isTgemAccessOrganization(tx, parsed.organizationId))) {
			throw new Error("TGEM organization not found");
		}
		if (parsed.id) {
			const existing = await tx.tgemAccessGroup.findFirst({
				where: { id: parsed.id, organizationId: parsed.organizationId },
				select: { id: true, name: true, permissions: true },
			});
			if (!existing) throw new Error("Access group not found");
			const group = await tx.tgemAccessGroup.update({
				where: { id: existing.id },
				data: { name: parsed.name, permissions },
			});
			await tx.tgemAccessAuditEvent.create({
				data: {
					organizationId: parsed.organizationId,
					groupId: group.id,
					actorUserId: actor.id,
					eventType: "group_updated",
					payload: {
						previous: {
							name: existing.name,
							permissions: existing.permissions,
						},
						next: { name: group.name, permissions: group.permissions },
					},
				},
			});
			return group;
		}

		const group = await tx.tgemAccessGroup.create({
			data: {
				organizationId: parsed.organizationId,
				name: parsed.name,
				permissions,
				createdByUserId: actor.id,
			},
		});
		await tx.tgemAccessAuditEvent.create({
			data: {
				organizationId: parsed.organizationId,
				groupId: group.id,
				actorUserId: actor.id,
				eventType: "group_created",
				payload: { name: group.name, permissions: group.permissions },
			},
		});
		return group;
	});
}

export async function saveTgemOrganizationAccessMemberships(
	input: z.infer<typeof membershipInputSchema>,
) {
	const actor = await requirePlatformAdmin();
	const parsed = membershipInputSchema.parse(input);
	const groupIds = Array.from(new Set(parsed.groupIds));
	return prisma.$transaction(async (tx) => {
		if (!(await isTgemAccessOrganization(tx, parsed.organizationId))) {
			throw new Error("TGEM organization not found");
		}
		const [target, groups, existing] = await Promise.all([
			tx.user.findFirst({
				where: {
					id: parsed.userId,
					organizationId: parsed.organizationId,
					status: "active",
				},
				select: { id: true },
			}),
			tx.tgemAccessGroup.findMany({
				where: { id: { in: groupIds }, organizationId: parsed.organizationId },
				select: { id: true },
			}),
			tx.tgemOrganizationAccessMembership.findMany({
				where: {
					userId: parsed.userId,
					group: { organizationId: parsed.organizationId },
				},
				select: { groupId: true },
			}),
		]);
		if (!target || groups.length !== groupIds.length)
			throw new Error("Access denied");
		const previousIds = existing.map((membership) => membership.groupId);
		const added = groupIds.filter((groupId) => !previousIds.includes(groupId));
		const removed = previousIds.filter(
			(groupId) => !groupIds.includes(groupId),
		);
		if (removed.length) {
			await tx.tgemOrganizationAccessMembership.deleteMany({
				where: { userId: parsed.userId, groupId: { in: removed } },
			});
		}
		if (added.length) {
			await tx.tgemOrganizationAccessMembership.createMany({
				data: added.map((groupId) => ({
					groupId,
					userId: parsed.userId,
					createdByUserId: actor.id,
				})),
			});
		}
		await writeMembershipAudit(tx, {
			organizationId: parsed.organizationId,
			actorUserId: actor.id,
			targetUserId: parsed.userId,
			addedGroupIds: added,
			removedGroupIds: removed,
		});
		return { userId: parsed.userId, groupIds };
	});
}

export async function getTgemSiteAccessData(siteId: string) {
	const user = await requireUser();
	const platformAdmin = await isPlatformAdmin(user.id);
	const site = await prisma.site.findFirst({
		where: { id: siteId },
		select: {
			id: true,
			name: true,
			organizationId: true,
			userId: true,
			organization: {
				select: {
					users: {
						where: { status: "active" },
						orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
						select: { id: true, firstName: true, lastName: true, email: true },
					},
					tgemAccessGroups: {
						orderBy: { name: "asc" },
						include: {
							organizationMemberships: {
								select: { userId: true },
							},
							siteMemberships: {
								where: { siteId },
								select: { userId: true },
							},
						},
					},
				},
			},
		},
	});
	if (
		!site?.organizationId ||
		!site.organization ||
		!(await isTgemAccessOrganization(prisma, site.organizationId)) ||
		(!platformAdmin && site.userId !== user.id)
	) {
		throw new Error("Only the project owner can manage site access");
	}
	return site;
}

export async function saveTgemSiteAccessMemberships(input: {
	siteId: string;
	userId: string;
	groupIds: string[];
}) {
	const actor = await requireUser();
	const platformAdmin = await isPlatformAdmin(actor.id);
	const parsed = z
		.object({
			siteId: z.string().trim().min(1),
			userId: z.string().trim().min(1),
			groupIds: z.array(z.string().trim().min(1)).max(100),
		})
		.strict()
		.parse(input);
	const groupIds = Array.from(new Set(parsed.groupIds));
	return prisma.$transaction(async (tx) => {
		const site = await tx.site.findUnique({
			where: { id: parsed.siteId },
			select: { organizationId: true, userId: true },
		});
		if (!site?.organizationId || (!platformAdmin && site.userId !== actor.id)) {
			throw new Error("Only the project owner can manage site access");
		}
		if (!(await isTgemAccessOrganization(tx, site.organizationId))) {
			throw new Error("TGEM organization not found");
		}
		const [target, groups, existing] = await Promise.all([
			tx.user.findFirst({
				where: {
					id: parsed.userId,
					organizationId: site.organizationId,
					status: "active",
				},
				select: { id: true },
			}),
			tx.tgemAccessGroup.findMany({
				where: { id: { in: groupIds }, organizationId: site.organizationId },
				select: { id: true },
			}),
			tx.tgemSiteAccessMembership.findMany({
				where: { siteId: parsed.siteId, userId: parsed.userId },
				select: { groupId: true },
			}),
		]);
		if (!target || groups.length !== groupIds.length)
			throw new Error("Access denied");
		const previousIds = existing.map((membership) => membership.groupId);
		const added = groupIds.filter((groupId) => !previousIds.includes(groupId));
		const removed = previousIds.filter(
			(groupId) => !groupIds.includes(groupId),
		);
		if (removed.length) {
			await tx.tgemSiteAccessMembership.deleteMany({
				where: {
					siteId: parsed.siteId,
					userId: parsed.userId,
					groupId: { in: removed },
				},
			});
		}
		if (added.length) {
			await tx.tgemSiteAccessMembership.createMany({
				data: added.map((groupId) => ({
					groupId,
					siteId: parsed.siteId,
					userId: parsed.userId,
					createdByUserId: actor.id,
				})),
			});
		}
		await writeMembershipAudit(tx, {
			organizationId: site.organizationId,
			actorUserId: actor.id,
			targetUserId: parsed.userId,
			siteId: parsed.siteId,
			addedGroupIds: added,
			removedGroupIds: removed,
		});
		return { siteId: parsed.siteId, userId: parsed.userId, groupIds };
	});
}
