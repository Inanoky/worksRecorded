export const reviewedDiaryScope = {
	siteId: "eval:diary-reviewed:ocelt",
	userId: "eval:diary-reviewed",
};

export function configureReviewedDiaryTracing(
	argv = process.argv.slice(2),
	env: Record<string, string | undefined> = process.env,
) {
	const enabled = argv.includes("--trace");
	if (enabled && !(env.LANGSMITH_API_KEY || env.LANGCHAIN_API_KEY)) {
		throw new Error("--trace requires LANGSMITH_API_KEY or LANGCHAIN_API_KEY.");
	}
	const project =
		env.AI_EVAL_LANGSMITH_PROJECT ||
		env.LANGSMITH_PROJECT ||
		env.LANGCHAIN_PROJECT ||
		"AI-Evals";
	env.LANGSMITH_TRACING = String(enabled);
	env.LANGCHAIN_TRACING_V2 = String(enabled);
	if (enabled) {
		env.LANGSMITH_PROJECT = project;
		env.LANGCHAIN_PROJECT = project;
		env.LANGCHAIN_CALLBACKS_BACKGROUND = "false";
		env.LANGSMITH_SAMPLING_RATE = "1";
		env.LANGCHAIN_SAMPLING_RATE = "1";
	}
	return { enabled, project: enabled ? project : null };
}

export function getReviewedDiaryModelSettings(
	role: "extractor" | "checker" = "extractor",
) {
	const modelKey =
		role === "checker" ? "AI_EVAL_CHECKER_MODEL" : "AI_EVAL_AGENT_MODEL";
	const effortKey =
		role === "checker"
			? "AI_EVAL_CHECKER_REASONING_EFFORT"
			: "AI_EVAL_REASONING_EFFORT";
	const model =
		process.env[modelKey]?.trim() ||
		(role === "checker"
			? siteDiaryExtractionCheckerModel
			: structuredSiteDiaryModel);
	const effort = process.env[effortKey];
	if (effort && !["low", "medium", "high"].includes(effort)) {
		throw new Error(`${effortKey} must be low, medium or high.`);
	}
	return {
		model,
		reasoningEffort: (effort ||
			(role === "checker"
				? siteDiaryExtractionCheckerReasoningEffort
				: structuredSiteDiaryReasoningEffort)) as "low" | "medium" | "high",
		useResponsesApi: diaryModelUsesResponsesApi(model) || undefined,
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

import {
	diaryModelUsesResponsesApi,
	siteDiaryExtractionCheckerModel,
	siteDiaryExtractionCheckerReasoningEffort,
	structuredSiteDiaryModel,
	structuredSiteDiaryReasoningEffort,
} from "@/flows/default-construction/backend/site-manager-agent/diaryModelSettings";
