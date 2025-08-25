"use server";

import { handleWorkerMessage } from "@/app/utils/clockInOut/workersFlow";

export async function handleWorkerRoute(args: { phone: string | null; formData: FormData }) {
  const { phone, formData } = args;
  if (!phone) return;
  await handleWorkerMessage(phone, formData);
}
