export const reviewedDiaryScope = {
  siteId: "eval:diary-reviewed:ocelt",
  userId: "eval:diary-reviewed",
};

export function getReviewedDiaryModelSettings(
  role: "extractor" | "checker" = "extractor",
) {
  const modelKey =
    role === "checker" ? "AI_EVAL_CHECKER_MODEL" : "AI_EVAL_AGENT_MODEL";
  const effortKey =
    role === "checker"
      ? "AI_EVAL_CHECKER_REASONING_EFFORT"
      : "AI_EVAL_REASONING_EFFORT";
  const model = process.env[modelKey]?.trim() || undefined;
  const effort = process.env[effortKey];
  if (effort && !["low", "medium", "high"].includes(effort)) {
    throw new Error(`${effortKey} must be low, medium or high.`);
  }
  return {
    model,
    reasoningEffort: effort as "low" | "medium" | "high" | undefined,
    useResponsesApi: model === "gpt-6.1-sol" || undefined,
  };
}

export function assertReviewedDiaryEnvironment() {
  if (process.env.RUN_AI_EVALS !== "true") {
    throw new Error("Set RUN_AI_EVALS=true to run real AI evals.");
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required.");
  }
  console.log("AI eval environment guard: PASS (frozen corpus, no database)");
  return reviewedDiaryScope;
}
