"use server";

import {
  handleZtcQualityRoute,
  isZtcQualityWorkerRole,
  type ZtcWorker,
} from "@/flows/ztc-production/backend";

export { isZtcQualityWorkerRole };

export async function handleDefaultProductionQualityRoute(args: {
  formData: FormData;
  worker: ZtcWorker;
}) {
  return handleZtcQualityRoute({
    ...args,
    drawingProfile: "default-production",
  });
}
