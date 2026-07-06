import {
  CLIENT_FLOW_IDS,
  TGEM_ORGANIZATION_ID,
  type ClientFlowId,
} from "@/lib/client-flows/constants";
import { getClientFlowIdForFlowModuleKey } from "@/lib/flows/registry";
import { resolveProductionFlowConfig } from "@/lib/production-flow/config";

export function resolveClientFlow(args: {
  organizationId?: string | null;
  siteId?: string | null;
}): ClientFlowId {
  if (args.organizationId === TGEM_ORGANIZATION_ID) {
    return CLIENT_FLOW_IDS.TGEM;
  }

  const productionFlowConfig = resolveProductionFlowConfig(args);
  if (productionFlowConfig) {
    return getClientFlowIdForFlowModuleKey(productionFlowConfig.flowModuleKey);
  }

  return CLIENT_FLOW_IDS.DEFAULT;
}
