import { getFlowFrontendModule } from "@/components/client-flows/flow-frontend-registry";
import type { FlowModuleKey } from "@/lib/flows/types";

type ClientFlowSiteDiaryProps = {
  flowModuleKey: FlowModuleKey;
  siteId: string;
};

export function ClientFlowSiteDiary({ flowModuleKey, siteId }: ClientFlowSiteDiaryProps) {
  const FlowSiteDiary = getFlowFrontendModule(flowModuleKey).SiteDiary;
  return <FlowSiteDiary siteId={siteId} />;
}
