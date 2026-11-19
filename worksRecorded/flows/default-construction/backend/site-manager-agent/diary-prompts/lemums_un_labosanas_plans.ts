import type { DiaryPromptSection } from "./types";

export function lemums_un_labosanas_plans(): DiaryPromptSection {
	return {
		id: "lemums_un_labosanas_plans",
		title: "Lēmums un mērķēts labošanas plāns",
		description:
			"Atgriež strukturētu lēmumu un precīzi ierobežo katru labošanas darbību.",
		version: 1,
		text: `Return verdict=accept when the row count and split are safe enough to save automatically.
Return verdict=repairable when the row count and split are safe, but a small field-level issue can be fixed by setting nullable fields to null. Include repairActions for every field to null.
Return verdict=unsafe when the proposed rows are too ambiguous or unsupported to save automatically and a deterministic field repair or one model repair would be unsafe.
Use verdict=retry only as a legacy alias for needs_model_repair when needed.
repairActions are only for safe nulling: rowIndex is zero-based and field must be Amounts, Units, WorkersInvolved, TimeInvolved, or Location. Do not use repairActions to rewrite text, change row categories, invent values, split rows, merge rows, drop rows, or replace a source-backed completed quantity with null.
Ja vajadzīgs modeļa labojums, atgriez modelRepairTargets katrai labojamai rindai: rowIndex, tieši maināmie fields un allowStructuralChanges. Apstiprinātām rindām labojumus neprasi. allowStructuralChanges=true tikai rindām, kuras jāsadala, jāapvieno vai jāizņem kā nepamatotas. Trūkstošai darbībai coverageComplete=false; pārējās pamatotās rindas paliek nemainītas. Labotājs saņems atlasītās rindas un atbilstošos kataloga kandidātus, nevis atkārtoti veiks visu ekstrakciju.
If model repair is needed, write concrete repairInstructions for the targeted repair step. The instruction must say which rows should be split into specific separate jobs, merged, dropped, or preserved, and why.
Give a complete actionable repair plan in the first check, including category and unit issues, because only one model repair is available.`,
	};
}
