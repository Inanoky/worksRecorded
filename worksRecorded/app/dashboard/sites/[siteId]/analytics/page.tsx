import { notFound } from "next/navigation";
import { getDefaultConstructionForma2Dashboard } from "@/flows/default-construction/backend/forma2-analytics-actions";
import { DefaultConstructionAnalytics } from "@/flows/default-construction/frontend/DefaultConstructionAnalytics";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { requireUser } from "@/lib/utils/requireUser";
import {
	getOrganizationLanguageByUserId,
	orgCheck,
} from "@/server/actions/shared-actions";

export default async function AnalyticsPage({
	params,
}: {
	params: Promise<{ siteId: string }>;
}) {
	const { siteId } = await params;
	const user = await requireUser();
	const site = await orgCheck(user.id, siteId);
	if (!site) notFound();

	const flowModuleKey = await resolveFlowModuleKeyForRuntime({
		organizationId: site.organizationId ?? null,
		siteId,
	});
	if (flowModuleKey !== FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION) notFound();

	const [initialData, organizationLanguage] = await Promise.all([
		getDefaultConstructionForma2Dashboard(siteId),
		getOrganizationLanguageByUserId(user.id),
	]);

	return (
		<DefaultConstructionAnalytics
			siteId={siteId}
			organizationLanguage={organizationLanguage}
			initialData={initialData}
		/>
	);
}
