"use server";

import {
  CLIENT_FLOW_IDS,
  TGEM_ORGANIZATION_ID,
  type ClientFlowId,
} from "@/lib/client-flows/constants";
import { resolveClientFlow } from "@/lib/client-flows/resolve-client-flow";
import { getFlowAssignmentForOrganization } from "@/lib/flows/assignments-server";
import { getClientFlowIdForFlowModuleKey } from "@/lib/flows/registry";

export async function resolveClientFlowForRuntime(args: {
  organizationId?: string | null;
  siteId?: string | null;
}): Promise<ClientFlowId> {
  if (args.organizationId === TGEM_ORGANIZATION_ID) {
    return CLIENT_FLOW_IDS.TGEM;
  }

  const assignment = await getFlowAssignmentForOrganization(args.organizationId);
  if (assignment?.enabled) {
    return getClientFlowIdForFlowModuleKey(assignment.flowModuleKey);
  }

  return resolveClientFlow(args);
}
