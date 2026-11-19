import type { DiaryPromptSection } from "./types";

export function atrasanas_vietas(): DiaryPromptSection {
	return {
		id: "atrasanas_vietas",
		title: "Darba vietas pamatojums",
		description:
			"Pieņem vietu tikai no aktuālās ziņas vai atļautas atsauces; konfigurācijas opcija pati par sevi nav pierādījums.",
		version: 1,
		text: `If the only unsupported field is Location, return verdict=repairable with a set_null repairAction for Location, not unsafe or needs_model_repair. Keep the source-backed work, quantity, units, comments, workers, and hours unchanged. A location appearing in dropdown options, even as the only option, is not evidence that it applies. Preserve locations supported by the current message or an allowed explicit reference to trusted context.`,
	};
}
