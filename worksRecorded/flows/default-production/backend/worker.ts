"use server";

import { handleWorkerMessage } from "@/flows/default-production/backend/worker-route";
import { handleZtcWorkerRoute } from "@/flows/ztc-production/backend";
import { resolveAdvancedProductionWorkflowContextForWorker } from "@/lib/production-flow/runtime-server";
import { resolveWorkerFlowRuntime } from "@/lib/flows/worker-runtime-server";
import { prisma } from "@/lib/utils/db";

export async function handleWorkerRoute(args: { phone: string | null; formData: FormData }) {
  const { phone, formData } = args;
  if (!phone) return;

  const worker = await prisma.workers.findFirst({
    where: { phone },
  });

  if (worker) {
    const runtime = await resolveWorkerFlowRuntime(worker);
    if (runtime.productionConfig?.strategies.whatsappWorker === "ztc-worker-v1") {
      const context = await resolveAdvancedProductionWorkflowContextForWorker(worker);
      if (context) {
        await handleZtcWorkerRoute({
          formData,
          worker: {
            ...worker,
            ztcFlowContext: context,
          },
        });
        return;
      }
    }
  }

  await handleWorkerMessage(phone, formData);
}
