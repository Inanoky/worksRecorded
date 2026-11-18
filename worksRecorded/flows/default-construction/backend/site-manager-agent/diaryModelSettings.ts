export const structuredSiteDiaryModel = "gpt-6.1-sol";
export const structuredSiteDiaryReasoningEffort = "medium" as const;
export const siteDiaryExtractionCheckerModel = "gpt-6.1-sol";
export const siteDiaryExtractionCheckerReasoningEffort = "medium" as const;

export function diaryModelUsesResponsesApi(model: string) {
	return model === "gpt-6.1-sol";
}
