import { CLIENT_FLOW_IDS, type ClientFlowId } from "@/lib/client-flows/constants";
import { DefaultSiteDiaryFlow } from "@/flows/default-construction/frontend";
import { TgemFlowPlaceholder } from "@/flows/tgem-invoice-approval/frontend";
import { ZtcSiteDiaryFlow } from "@/flows/ztc-production/frontend";

type ClientFlowSiteDiaryProps = {
  flowId: ClientFlowId;
  siteId: string;
};

export function ClientFlowSiteDiary({ flowId, siteId }: ClientFlowSiteDiaryProps) {
  if (flowId === CLIENT_FLOW_IDS.TGEM) {
    return <TgemFlowPlaceholder />;
  }

  if (flowId === CLIENT_FLOW_IDS.ZTC) {
    return <ZtcSiteDiaryFlow siteId={siteId} />;
  }

  return <DefaultSiteDiaryFlow siteId={siteId} />;
}
