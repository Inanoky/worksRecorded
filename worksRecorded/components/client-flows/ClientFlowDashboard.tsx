"use client";

import { getFlowFrontendModule } from "@/components/client-flows/flow-frontend-registry";
import type { FimaProjectDiary } from "@/lib/fima/project-diary";
import type { FlowModuleKey } from "@/lib/flows/types";

type ClientFlowDashboardProps = {
	initialFimaDiary?: FimaProjectDiary | null;
	flowModuleKey: FlowModuleKey;
	siteId: string;
	bisEnabled: boolean;
	organizationLanguage?: string | null;
};

export function ClientFlowDashboard({
	flowModuleKey,
	siteId,
	bisEnabled,
	organizationLanguage,
	initialFimaDiary,
}: ClientFlowDashboardProps) {
	const FlowDashboard = getFlowFrontendModule(flowModuleKey).Dashboard;
	return (
		<FlowDashboard
			siteId={siteId}
			bisEnabled={bisEnabled}
			organizationLanguage={organizationLanguage}
			initialFimaDiary={initialFimaDiary}
		/>
	);
}
