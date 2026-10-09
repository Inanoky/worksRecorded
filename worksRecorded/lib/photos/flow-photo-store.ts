import type { Prisma, PrismaClient } from "@prisma/client";
import { getFlowModuleByKey } from "@/lib/flows/registry";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { prisma } from "@/lib/utils/db";

type PhotoClient =
	| Pick<PrismaClient, "photos" | "ztcPhoto">
	| Pick<Prisma.TransactionClient, "photos" | "ztcPhoto">;

export function photoStoreForFlow(
	production: boolean,
	client: PhotoClient = prisma,
): PrismaClient["photos"] {
	return (production
		? client.ztcPhoto
		: client.photos) as unknown as PrismaClient["photos"];
}

export async function getSitePhotoStore(args: {
	siteId?: string | null;
	organizationId?: string | null;
}) {
	const organizationId =
		args.organizationId ??
		(args.siteId
			? (
					await prisma.site.findUnique({
						where: { id: args.siteId },
						select: { organizationId: true },
					})
				)?.organizationId
			: null);
	const flow = await resolveFlowModuleKeyForRuntime({
		siteId: args.siteId,
		organizationId,
	});
	return photoStoreForFlow(getFlowModuleByKey(flow)?.clientFlowId === "ztc");
}

export async function getUserPhotoStore(userId: string, siteId?: string) {
	if (siteId) return getSitePhotoStore({ siteId });
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { organizationId: true },
	});
	return getSitePhotoStore({ organizationId: user?.organizationId });
}
