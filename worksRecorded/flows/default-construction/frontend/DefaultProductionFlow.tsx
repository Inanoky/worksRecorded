"use client";

import type { FlowDashboardProps } from "@/components/client-flows/flow-frontend-registry";
import SiteDiaryList from "@/components/sitediary/SiteDiaryList";

export function DefaultProductionFlow({
	siteId,
	bisEnabled,
	organizationLanguage,
	initialFimaDiary,
}: FlowDashboardProps) {
	return (
		<SiteDiaryList
			siteId={siteId}
			bisEnabled={bisEnabled}
			organizationLanguage={organizationLanguage}
			initialFimaDiary={initialFimaDiary}
			batchEditing
		/>
	);
}
