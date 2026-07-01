import { CLIENT_FLOW_IDS, type ClientFlowId } from "@/lib/client-flows/constants";
import { DefaultSiteDiaryFlow } from "@/components/client-flows/default/DefaultSiteDiaryFlow";
import { TgemFlowPlaceholder } from "@/components/client-flows/tgem/TgemFlowPlaceholder";
import { ZtcSiteDiaryFlow } from "@/components/client-flows/ztc/ZtcSiteDiaryFlow";

type ClientFlowSiteDiaryProps = {
  flowId: ClientFlowId;
  siteId: string;
};

export function ClientFlowSiteDiary({ flowId, siteId }: ClientFlowSiteDiaryProps) {
  if (flowId === CLIENT_FLOW_IDS.TGEM) {
    return (
      <TgemFlowPlaceholder
        title="TGEM flow"
        description="TGEM has a separate frontend boundary. Invoice approval UI will be added here."
      />
    );
  }

  if (flowId === CLIENT_FLOW_IDS.ZTC) {
    return <ZtcSiteDiaryFlow siteId={siteId} />;
  }

  return <DefaultSiteDiaryFlow siteId={siteId} />;
}
