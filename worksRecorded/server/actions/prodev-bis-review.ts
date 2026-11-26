"use server";

import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { isProdevOrganization } from "@/lib/branding/prodev";
import { getAuthorizedProjectSite } from "@/lib/projects/authorized-project-site";
import {
	changeProdevBisReview,
	defaultProdevBisReview,
	prodevBisReviewStatusSchema,
	readProdevBisReview,
} from "@/lib/site-diary/prodev-bis-review";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

const scope = z.object({
	siteId: z.string().uuid(),
	recordId: z.string().uuid(),
});
const mutation = scope.extend({
	requestId: z.string().uuid(),
	status: prodevBisReviewStatusSchema,
	expectedVersion: z.number().int().nonnegative(),
});

async function authorizedScope(input: z.infer<typeof scope>) {
	const user = await requireUser();
	const site = await getAuthorizedProjectSite(user.id, input.siteId);
	if (!site?.organizationId || !isProdevOrganization(site.organization?.name))
		throw new Error("Nav piekļuves ProDev projektam.");
	return {
		user,
		where: {
			id: input.recordId,
			siteId: input.siteId,
			organizationId: site.organizationId,
			archivedAt: null,
		},
	};
}

export async function getProdevBisReview(args: z.input<typeof scope>) {
	const { where } = await authorizedScope(scope.parse(args));
	const record = await prisma.sitediaryrecords.findFirst({
		where,
		select: { evalMetadata: true },
	});
	if (!record) throw new Error("Ieraksts nav pieejams šajā projektā.");
	return readProdevBisReview(record.evalMetadata) ?? defaultProdevBisReview;
}

export async function saveProdevBisReview(args: z.input<typeof mutation>) {
	const input = mutation.parse(args);
	const { user, where } = await authorizedScope(input);
	const actor = await prisma.user.findUnique({
		where: { id: user.id },
		select: { firstName: true, lastName: true, email: true },
	});
	const actorName =
		[actor?.firstName, actor?.lastName].filter(Boolean).join(" ") ||
		actor?.email ||
		user.id;
	return prisma.$transaction(async (tx) => {
		const rows = await tx.$queryRaw<{ evalMetadata: Prisma.JsonValue }[]>`
			SELECT "evalMetadata" FROM public.sitediaryrecords
			WHERE id = ${where.id} AND "siteId" = ${where.siteId}
				AND "organizationId" = ${where.organizationId} AND "archivedAt" IS NULL
			FOR UPDATE
		`;
		if (rows.length !== 1)
			throw new Error("Ieraksts nav pieejams šajā projektā.");
		const stored = rows[0].evalMetadata;
		const metadata =
			stored && typeof stored === "object" && !Array.isArray(stored)
				? stored
				: {};
		const current = readProdevBisReview(metadata) ?? defaultProdevBisReview;
		const next = changeProdevBisReview(current, {
			id: input.requestId,
			to: input.status,
			expectedVersion: input.expectedVersion,
			actorId: user.id,
			actorName,
			at: new Date().toISOString(),
		});
		if (current !== next)
			await tx.sitediaryrecords.update({
				where: { id: where.id },
				data: { evalMetadata: { ...metadata, prodevBisReview: next } },
			});
		return next;
	});
}
