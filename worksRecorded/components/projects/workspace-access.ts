import "server-only";
import { notFound } from "next/navigation";
import { LIMENI_ORGANIZATION_ID } from "@/flows/default-construction/lib/diary-photos";
import { isFimaDiary } from "@/lib/fima/diary-collaboration";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { getAuthorizedProjectSite } from "@/lib/projects/authorized-project-site";
import { requireUser } from "@/lib/utils/requireUser";
import type { WorkspaceDescriptor } from "./workspace-store";

type WorkspaceAccessTrace = {
	measure<T>(phase: string, task: () => T | Promise<T>): Promise<T>;
};

export async function getWorkspaceAccess(
	siteId: string,
	trace?: WorkspaceAccessTrace,
): Promise<WorkspaceDescriptor> {
	const measure = <T>(phase: string, task: () => T | Promise<T>) =>
		trace ? trace.measure(phase, task) : task();
	const user = await measure("workspaceAuth", () => requireUser());
	const site = await measure("workspaceSiteAccess", () =>
		getAuthorizedProjectSite(user.id, siteId),
	);
	if (!site) notFound();
	const organizationId = site.organizationId ?? null;
	const flowModuleKey = await measure("workspaceFlow", () =>
		resolveFlowModuleKeyForRuntime({
			siteId,
			organizationId,
		}),
	);
	return {
		siteId,
		userId: user.id,
		organizationId,
		name: site.name,
		flowModuleKey,
		visualPreload:
			organizationId === LIMENI_ORGANIZATION_ID &&
			flowModuleKey === FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION,
		fimaActs: Boolean(site.bisCaseId && isFimaDiary(site.siteDiaryRecordsMap)),
		constructionWorkspace:
			flowModuleKey === FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION &&
			organizationId !== LIMENI_ORGANIZATION_ID &&
			!(site.bisCaseId && isFimaDiary(site.siteDiaryRecordsMap)),
	};
}
