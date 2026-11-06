import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { prisma } from "@/lib/utils/db";

export async function GET() {
	const { getUser } = getKindeServerSession();
	const user = await getUser();
	if (!user)
		return Response.json(
			{},
			{ status: 401, headers: { "Cache-Control": "private, no-store" } },
		);
	const account = await prisma.user.findUnique({
		where: { id: user.id },
		select: { organizationId: true },
	});
	const organizationId = account?.organizationId;
	if (
		!organizationId ||
		(await resolveFlowModuleKeyForRuntime({ organizationId })) !==
			FLOW_MODULE_KEYS.ZTC_PRODUCTION
	) {
		return Response.json(
			{},
			{ status: 403, headers: { "Cache-Control": "private, no-store" } },
		);
	}
	const projects = await prisma.site.findMany({
		where: { organizationId },
		select: { id: true, name: true, description: true, imageUrl: true },
		orderBy: { createdAt: "desc" },
	});
	return Response.json(
		{ userId: user.id, organizationId, projects },
		{ headers: { "Cache-Control": "private, no-store" } },
	);
}
