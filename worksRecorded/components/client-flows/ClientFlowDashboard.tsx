import { CLIENT_FLOW_IDS, type ClientFlowId } from "@/lib/client-flows/constants";
import { DefaultProductionFlow } from "@/flows/default-construction/frontend";
import { TgemFlowPlaceholder } from "@/flows/tgem-invoice-approval/frontend";
import { ZtcProductionFlow } from "@/flows/ztc-production/frontend";

type ClientFlowDashboardProps = {
  flowId: ClientFlowId;
  siteId: string;
  bisEnabled: boolean;
  organizationLanguage?: string | null;
};

export function ClientFlowDashboard({
  flowId,
  siteId,
  bisEnabled,
  organizationLanguage,
}: ClientFlowDashboardProps) {
  if (flowId === CLIENT_FLOW_IDS.TGEM) {
    return <TgemFlowPlaceholder />;
  }

  if (flowId === CLIENT_FLOW_IDS.ZTC) {
    return (
      <ZtcProductionFlow
        siteId={siteId}
        bisEnabled={bisEnabled}
        organizationLanguage={organizationLanguage}
      />
    );
  }

  return (
    <DefaultProductionFlow
      siteId={siteId}
      bisEnabled={bisEnabled}
      organizationLanguage={organizationLanguage}
    />
  );
}
