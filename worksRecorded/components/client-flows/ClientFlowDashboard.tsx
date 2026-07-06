import { getFlowFrontendModule } from "@/components/client-flows/flow-frontend-registry";
import type { FlowModuleKey } from "@/lib/flows/types";

type ClientFlowDashboardProps = {
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
}: ClientFlowDashboardProps) {
  const FlowDashboard = getFlowFrontendModule(flowModuleKey).Dashboard;
  return (
    <FlowDashboard
      siteId={siteId}
      bisEnabled={bisEnabled}
      organizationLanguage={organizationLanguage}
    />
  );
}
