"use client";

import type { FlowDashboardProps } from "@/components/client-flows/flow-frontend-registry";
import SiteDiaryList from "@/components/sitediary/SiteDiaryList";
import { useLimeniProjectData } from "./LimeniProjectData";

export function DefaultProductionFlow({
	siteId,
	bisEnabled,
	organizationLanguage,
	initialFimaDiary,
}: FlowDashboardProps) {
	const workspace = useLimeniProjectData();
	if (workspace.enabled) return null;
	return (
		<SiteDiaryList
			siteId={siteId}
			bisEnabled={bisEnabled}
			constructionBisTools
			organizationLanguage={organizationLanguage}
			initialFimaDiary={initialFimaDiary}
			batchEditing
		/>
	);
}
