"use server";

import { handleWorkerMessage } from "@/lib/utils/whatsapp-helpers/handling-roles-routes/worker-route";

export async function handleWorkerRoute(args: { phone: string | null; formData: FormData }) {
  const { phone, formData } = args;
  if (!phone) return;
  await handleWorkerMessage(phone, formData);
}
