import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { LIMENI_ORGANIZATION_ID } from "@/flows/default-construction/lib/diary-photos";
import { isFimaDiary } from "@/lib/fima/diary-collaboration";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { createPerfTrace } from "@/lib/observability/perf";
import { getAuthorizedProjectSite } from "@/lib/projects/authorized-project-site";
import { requireUser } from "@/lib/utils/requireUser";
import type { WorkspaceDescriptor } from "./workspace-store";

type WorkspaceAccessTrace = {
	measure<T>(phase: string, task: () => T | Promise<T>): Promise<T>;
};

export async function loadWorkspaceAccess(
	siteId: string,
	trace?: WorkspaceAccessTrace,
): Promise<{
	descriptor: WorkspaceDescriptor;
	organizationLanguage: string;
	bisCaseId: string | null;
	bisCaseNumber: string | null;
	siteDiaryRecordsMap: unknown;
}> {
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
	const descriptor = {
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
	return {
		descriptor,
		organizationLanguage: site.organization?.orgLanguage ?? "en",
		bisCaseId: site.bisCaseId ?? null,
		bisCaseNumber: site.bisCaseNumber ?? null,
		siteDiaryRecordsMap: site.siteDiaryRecordsMap,
	};
}

export const getWorkspaceRouteContext = cache(async (siteId: string) => {
	const trace = createPerfTrace({
		route: "/dashboard/sites/[siteId]/workspace-access",
		category: "action",
		siteId,
	});
	try {
		const context = await loadWorkspaceAccess(siteId, trace);
		trace.end({
			status: 200,
			extra: {
				flowModuleKey: context.descriptor.flowModuleKey,
				constructionWorkspace: context.descriptor.constructionWorkspace,
			},
		});
		return context;
	} catch (error) {
		trace.fail(error, { status: 500 });
		throw error;
	}
});

export async function getWorkspaceAccess(siteId: string) {
	return (await getWorkspaceRouteContext(siteId)).descriptor;
}
