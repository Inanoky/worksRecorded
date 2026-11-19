import type { DiaryPromptSection } from "./types";

export function forma2_piesaiste(): DiaryPromptSection {
	return {
		id: "forma2_piesaiste",
		title: "Forma2 pozīciju piesaiste",
		description:
			"Pārbauda konkrētās tāmes pozīcijas atbilstību darba būtībai, sistēmai, materiālam un izmēram.",
		version: 1,
		text: `Prefer a compatible specific Forma2 position; otherwise use a compatible configured generic category. If no category is supported, mark only that activity needs_review. Water-pipe excavation must not be assigned to a sewer-specific position merely because its name mentions excavation. Never change OD220 to D200, a material, or a utility system without explicit source evidence or a verified project mapping. A nearby well identifier is location evidence, not proof that a water work is sewer work. Conflicting lengths such as 22.09 and 22.9 require review of the affected calculation; do not silently choose an operand.`,
	};
}
