"use server";

import {
  CLIENT_FLOW_IDS,
  type ClientFlowId,
} from "@/lib/client-flows/constants";
import { getClientFlowIdForFlowModuleKey } from "@/lib/flows/registry";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";

export async function resolveClientFlowForRuntime(args: {
  organizationId?: string | null;
  siteId?: string | null;
}): Promise<ClientFlowId> {
  const flowModuleKey = await resolveFlowModuleKeyForRuntime(args);
  return getClientFlowIdForFlowModuleKey(flowModuleKey) ?? CLIENT_FLOW_IDS.DEFAULT;
}
