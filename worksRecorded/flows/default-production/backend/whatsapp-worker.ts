"use server";

import {
  handleZtcWorkerRoute,
  type ZtcWorker,
} from "@/flows/ztc-production/backend";

export async function handleDefaultProductionWorkerRoute(args: {
  formData: FormData;
  worker: ZtcWorker;
}) {
  return handleZtcWorkerRoute({
    ...args,
    drawingProfile: "default-production",
  });
}
