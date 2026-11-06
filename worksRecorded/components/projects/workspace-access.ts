import "server-only";
import { notFound } from "next/navigation";
import { LIMENI_ORGANIZATION_ID } from "@/flows/default-construction/lib/diary-photos";
import { isFimaDiary } from "@/lib/fima/diary-collaboration";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import type { WorkspaceDescriptor } from "./workspace-store";

export async function getWorkspaceAccess(
	siteId: string,
): Promise<WorkspaceDescriptor> {
	const user = await requireUser();
	const site = await orgCheck(user.id, siteId);
	if (!site) notFound();
	const organizationId = site.organizationId ?? null;
	const flowModuleKey = await resolveFlowModuleKeyForRuntime({
		siteId,
		organizationId,
	});
	const configuration = await prisma.site.findUnique({
		where: { id: siteId },
		select: { bisCaseId: true, siteDiaryRecordsMap: true },
	});
	return {
		siteId,
		userId: user.id,
		organizationId,
		name: site.name,
		flowModuleKey,
		visualPreload:
			organizationId === LIMENI_ORGANIZATION_ID &&
			flowModuleKey === FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION,
		fimaActs: Boolean(
			configuration?.bisCaseId &&
				isFimaDiary(configuration.siteDiaryRecordsMap),
		),
		constructionWorkspace:
			flowModuleKey === FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION &&
			organizationId !== LIMENI_ORGANIZATION_ID &&
			!(
				configuration?.bisCaseId &&
				isFimaDiary(configuration.siteDiaryRecordsMap)
			),
	};
}
