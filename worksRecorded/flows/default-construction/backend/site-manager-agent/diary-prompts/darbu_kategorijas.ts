import { DIARY_ADDITIONAL_WORK_POLICY } from "../diarySourcePolicy";
import type { DiaryPromptSection } from "./types";

export function darbu_kategorijas(): DiaryPromptSection {
	return {
		id: "darbu_kategorijas",
		title: "Projekta darbu kategorijas",
		description:
			"Lieto konkrētā projekta darbu vārdnīcu un saīsinājumus, atšķirot pilno katalogu no labošanas kandidātiem.",
		version: 2,
		text: `${DIARY_ADDITIONAL_WORK_POLICY}
Check category and configured measurement-unit compatibility as well as splitting. Do not accept a measurable completed work classified as Notes merely because the material is omitted: request clarification if context cannot safely resolve it. Do not guess a different material, category or unit to force a match.
Configured speechAliases are project-specific vocabulary mappings, not evidence of completed quantities or labour. Use the configured work catalog below for category decisions, even if historical context is truncated. A repair check receives relevant candidates and the categories already used; this scoped catalog is not the full project catalog. Do not demand unrelated category changes in a repair check.
Use only a source-compatible category from the configured catalog. If no category is supported, mark only that activity needs_review.`,
	};
}
