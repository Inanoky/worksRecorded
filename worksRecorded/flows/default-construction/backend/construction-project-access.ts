import { isFimaDiary } from "@/lib/fima/diary-collaboration";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { getAuthorizedProjectSite } from "@/lib/projects/authorized-project-site";
import { ProjectAccessError } from "../visual/project-access-error";

export async function requireConstructionProjectAccess(
	userId: string,
	siteId: string,
) {
	const site = await getAuthorizedProjectSite(userId, siteId);
	if (!site || !site.organizationId)
		throw new ProjectAccessError("Project access denied");
	const flow = await resolveFlowModuleKeyForRuntime({
		siteId,
		organizationId: site.organizationId,
	});
	if (flow !== FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION)
		throw new ProjectAccessError("Construction workspace is unavailable");
	if (site.bisCaseId && isFimaDiary(site.siteDiaryRecordsMap))
		throw new ProjectAccessError("Construction workspace is unavailable");
	return {
		organizationId: site.organizationId,
		bisCaseId: site.bisCaseId,
	};
}
