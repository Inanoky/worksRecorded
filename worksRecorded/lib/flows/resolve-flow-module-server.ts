"use server";

import { TGEM_ORGANIZATION_ID } from "@/lib/client-flows/constants";
import { getFlowAssignmentForOrganization } from "@/lib/flows/assignments-server";
import { FLOW_MODULE_KEYS, type FlowModuleKey } from "@/lib/flows/types";
import { resolveProductionFlowConfigForRuntime } from "@/lib/production-flow/config-server";

export async function resolveFlowModuleKeyForRuntime(args: {
  organizationId?: string | null;
  siteId?: string | null;
}): Promise<FlowModuleKey> {
  if (args.organizationId === TGEM_ORGANIZATION_ID) {
    return FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL;
  }

  const assignment = await getFlowAssignmentForOrganization(args.organizationId);
  if (assignment?.enabled) {
    return assignment.flowModuleKey;
  }

  const productionConfig = await resolveProductionFlowConfigForRuntime(args);
  if (productionConfig?.flowModuleKey) {
    return productionConfig.flowModuleKey;
  }

  return FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION;
}
