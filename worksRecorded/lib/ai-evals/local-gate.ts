import { headers } from "next/headers";
import { notFound } from "next/navigation";

export function isLocalHost(host: string | null | undefined) {
  const normalized = String(host ?? "").toLowerCase().split(":")[0];
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

export function isLocalAiEvalUiEnabledForHost(host?: string | null) {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_LOCAL_AI_EVAL_UI === "true" ||
    isLocalHost(host)
  );
}

export async function isLocalAiEvalUiEnabled() {
  const requestHeaders = await headers();
  return isLocalAiEvalUiEnabledForHost(requestHeaders.get("host"));
}

export async function requireLocalAiEvalUi() {
  if (!(await isLocalAiEvalUiEnabled())) notFound();
}
