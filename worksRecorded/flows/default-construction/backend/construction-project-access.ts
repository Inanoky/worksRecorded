import { isFimaDiary } from "@/lib/fima/diary-collaboration";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { prisma } from "@/lib/utils/db";
import { orgCheck } from "@/server/actions/shared-actions";
import { ProjectAccessError } from "../visual/project-access-error";

export async function requireConstructionProjectAccess(
	userId: string,
	siteId: string,
) {
	const site = await orgCheck(userId, siteId);
	if (!site || !site.organizationId)
		throw new ProjectAccessError("Project access denied");
	const flow = await resolveFlowModuleKeyForRuntime({
		siteId,
		organizationId: site.organizationId,
	});
	if (flow !== FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION)
		throw new ProjectAccessError("Construction workspace is unavailable");
	const configuration = await prisma.site.findFirst({
		where: { id: siteId, organizationId: site.organizationId },
		select: { bisCaseId: true, siteDiaryRecordsMap: true },
	});
	if (
		!configuration ||
		(configuration.bisCaseId && isFimaDiary(configuration.siteDiaryRecordsMap))
	)
		throw new ProjectAccessError("Construction workspace is unavailable");
	return { organizationId: site.organizationId };
}
