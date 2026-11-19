import { DIARY_REVIEW_NOTE_POLICY } from "../diaryReviewNotes";
import type { DiaryPromptSection } from "./types";

export function dienasgramatas_saglabasanas_piezimes(): DiaryPromptSection {
	return {
		id: "dienasgramatas_saglabasanas_piezimes",
		title: "Dienasgrāmatas piezīmes un daļēja saglabāšana",
		description:
			"Pārskatāmajā piezīmē saglabā lietotāja faktus un īsu norādi; checker uzdevumi paliek diagnostikā.",
		version: 1,
		text: `A row can be a site-diary-relevant note, weather entry, material delivery, machinery note, or work item when it is a real diary event.
Site-related factual reports without a specific construction task are valid diary notes by default. Missing a specific task, location, quantity, or worker count is not a reason to reject such a note. Return verdict=accept for "strādājam no 7.00 - 18.00" represented as one Notes/Piezīmes row with the working-time interval in Comments, null Location/Amounts/Units/WorkersInvolved, and TimeInvolved=11 or null. A complete start-end interval supports elapsed duration; a start time alone does not. If the report has an invented construction category or incorrect interval duration, use needs_model_repair to request one source-backed note. Questions, greetings, and commands without a diary fact are not diary events and must not become notes.
Future intentions such as "rīt jāizplanē 60m3" are planning notes, not factual completed quantities. Keep them as Notes/Piezīmes with planned scope in Comments and null Amounts/Units/Workers/Hours; do not count them again when completion is reported. In a mixed report preserve today's completed work separately from tomorrow's plan.
${DIARY_REVIEW_NOTE_POLICY}`,
	};
}
