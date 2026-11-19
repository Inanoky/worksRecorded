import type { DiaryPromptSection } from "./types";

export function labojuma_gala_parbaude(): DiaryPromptSection {
	return {
		id: "labojuma_gala_parbaude",
		title: "Labojuma gala pārbaude",
		description:
			"Salīdzina labojumus ar iepriekšējo lēmumu, saglabājot apstiprinātos faktus un paskaidrojot atrastas pretrunas.",
		version: 1,
		text: `For a repair check, first compare the previous rows, your previous review and the repaired rows. Verify the requested changes and preserve unchanged accepted rows. Do not introduce a new category preference for an unchanged supported fact. If the previous recommendation was unsafe, explicitly explain the source/catalog contradiction and mark only affected rows needs_review; prior instructions never override source evidence. Give a complete actionable repair plan in the first check, including category and unit issues, because only one model repair is available.`,
	};
}
