import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

export async function fimaAccess(siteId?: string) {
	const user = await requireUser();
	const account = await prisma.user.findUnique({
		where: { id: user.id },
		select: { organizationId: true },
	});
	const organizationId = account?.organizationId;
	if (
		!organizationId ||
		(await resolveFlowModuleKeyForRuntime({ organizationId })) !== "fima"
	)
		throw new Error("FIMA organizācijas piekļuve nav pieejama");
	if (
		siteId &&
		!(await prisma.site.findFirst({
			where: { id: siteId, organizationId },
			select: { id: true },
		}))
	)
		throw new Error("Projekts nav šajā organizācijā");
	return { userId: user.id, organizationId };
}
