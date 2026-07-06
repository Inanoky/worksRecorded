"use server";

import { getFlowModuleByKey } from "@/lib/flows/registry";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import type { FlowModuleDefinition, FlowModuleKey } from "@/lib/flows/types";
import { resolveProductionFlowConfigForRuntime } from "@/lib/production-flow/config-server";

export type WorkerFlowRuntime = {
  flowModuleKey: FlowModuleKey;
  flowModule: FlowModuleDefinition | null;
  productionConfig: Awaited<ReturnType<typeof resolveProductionFlowConfigForRuntime>>;
};

export async function resolveWorkerFlowRuntime(worker: {
  organizationId?: string | null;
  siteId?: string | null;
}): Promise<WorkerFlowRuntime> {
  const flowModuleKey = await resolveFlowModuleKeyForRuntime({
    organizationId: worker.organizationId,
    siteId: worker.siteId,
  });
  const productionConfig = await resolveProductionFlowConfigForRuntime({
    organizationId: worker.organizationId,
    siteId: worker.siteId,
  });

  return {
    flowModuleKey,
    flowModule: getFlowModuleByKey(flowModuleKey),
    productionConfig,
  };
}
