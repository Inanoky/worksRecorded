export const structuredSiteDiaryModel = "gpt-6.1-sol";
export const structuredSiteDiaryReasoningEffort = "medium" as const;
export const siteDiaryExtractionCheckerModel = "gpt-6.1-sol";
export const siteDiaryExtractionCheckerReasoningEffort = "medium" as const;

export function diaryModelOutputTokenLimit(source: string) {
	return Math.min(24_576, Math.max(8_192, Math.ceil(source.length * 1.5)));
}

export function diaryModelUsesResponsesApi(model: string) {
	return model === "gpt-6.1-sol";
}

export function diaryModelReasoningOptions(
	effort: "low" | "medium" | "high",
	useResponsesApi: boolean,
) {
	return {
		reasoning: { effort },
		modelKwargs: useResponsesApi
			? { reasoning: { effort } }
			: { reasoning_effort: effort },
	};
}
