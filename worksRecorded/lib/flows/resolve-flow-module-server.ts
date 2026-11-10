"use server";

import { TGEM_ORGANIZATION_ID } from "@/lib/client-flows/constants";
import { FLOW_MODULE_KEYS, type FlowModuleKey } from "@/lib/flows/types";
import {
  loadProductionFlowResolutionData,
  resolveProductionFlowConfigForRuntime,
} from "@/lib/production-flow/config-server";

export async function resolveFlowModuleKeyForRuntime(args: {
  organizationId?: string | null;
  siteId?: string | null;
}): Promise<FlowModuleKey> {
  if (args.organizationId === TGEM_ORGANIZATION_ID) {
    return FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL;
  }

  const resolutionData = await loadProductionFlowResolutionData(args.organizationId);
  const { assignment } = resolutionData;
  if (assignment?.enabled) {
    return assignment.flowModuleKey === FLOW_MODULE_KEYS.DEMO
      ? FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION
      : assignment.flowModuleKey;
  }

  const productionConfig = await resolveProductionFlowConfigForRuntime(
    args,
    resolutionData,
  );
  if (productionConfig?.flowModuleKey) {
    return productionConfig.flowModuleKey;
  }

  return FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION;
}
