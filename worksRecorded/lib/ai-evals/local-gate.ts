import { notFound } from "next/navigation";

export function isAiEvalUiEnabled() {
  return process.env.ENABLE_LOCAL_AI_EVAL_UI === "true";
}

export function requireAiEvalUiEnabled() {
  if (!isAiEvalUiEnabled()) notFound();
}
