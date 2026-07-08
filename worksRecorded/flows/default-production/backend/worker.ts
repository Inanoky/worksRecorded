"use server";

import { handleWorkerMessage } from "@/flows/default-production/backend/worker-route";
import {
  handleZtcWorkerRoute,
  type ProductionDrawingExtractionProfile,
} from "@/flows/ztc-production/backend";
import { handleDefaultProductionWorkerRoute } from "@/flows/default-production/backend/whatsapp-worker";
import { resolveAdvancedProductionWorkflowContextForWorker } from "@/lib/production-flow/runtime-server";
import { resolveWorkerFlowRuntime } from "@/lib/flows/worker-runtime-server";
import { prisma } from "@/lib/utils/db";

function getDrawingProfileForProductionConfig(
  config: Awaited<ReturnType<typeof resolveWorkerFlowRuntime>>["productionConfig"],
): ProductionDrawingExtractionProfile {
  return config?.flowModuleKey === "default-production" ? "default-production" : "ztc";
}

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
        const productionWorker = {
          ...worker,
          ztcFlowContext: context,
        };
        const drawingProfile = getDrawingProfileForProductionConfig(runtime.productionConfig);
        if (drawingProfile === "default-production") {
          await handleDefaultProductionWorkerRoute({
            formData,
            worker: productionWorker,
          });
        } else {
          await handleZtcWorkerRoute({
            formData,
            worker: productionWorker,
            drawingProfile,
          });
        }
        return;
      }
    }
  }

  await handleWorkerMessage(phone, formData);
}
