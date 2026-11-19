import {
	type DiaryExtractionEvalCase,
	reviewedDiaryCorpus,
} from "./reviewed-diary-cases";

function row(
	code: string,
	amount: number,
	unit: string,
	dateISO: string,
): DiaryExtractionEvalCase["expectedRecords"][number] {
	const position = reviewedDiaryCorpus.project.positions.find(
		(item) => item.kind === "work" && item.code === code,
	);
	if (!position) throw new Error(`Missing Ocelt position ${code}`);
	return {
		id: `position-${code}`,
		dateISO,
		work: `${position.code} ${position.categoryName} - ${position.name}`,
		location: null,
		commentSignals: [],
		reviewedComment: null,
		amount,
		unit,
		workers: null,
		hours: null,
		forma2PositionId: position.id,
	};
}

export const oceltScenarioCases: DiaryExtractionEvalCase[] = [
	{
		id: "ocelt-scenario-three-works-calculated-volumes",
		intent:
			"Trīs atsevišķi sadzīves kanalizācijas darbi ar vienu skaidru garumu un diviem neatkarīgiem apjoma aprēķiniem.",
		receivedDateISO: "2026-11-18",
		sourceText:
			"2026. gada 12. novembrī posmā no akas AK1-7 līdz AK1-6 iebūvēti 22,09 metri sadzīves kanalizācijas PP daudzslāņu caurules D200. Tāmes pozīcija 2.4. Šim pašam posmam veikta tranšejas rakšana, pozīcija 2.11, ar apjomu 3,33 kubikmetri grunts uz katru iebūvēto caurules metru. Papildus ap cauruli izveidots smilts apbērums, pozīcija 2.13, patērējot 0,3 kubikmetrus smilts uz katru šī paša posma metru. Aprēķini rakšanas un smilts apbēruma kopējos apjomus.",
		tags: [
			"ocelt",
			"derived-scenario",
			"multi-work",
			"forma2",
			"calculation",
			"backdated",
		],
		tier: "regression",
		priority: "critical",
		expectedRecords: [
			row("2.4", 22.09, "m", "2026-11-12"),
			row("2.11", 73.56, "m3", "2026-11-12"),
			row("2.13", 6.63, "m3", "2026-11-12"),
		],
	},
	{
		id: "ocelt-scenario-two-works-conflicting-reference",
		intent:
			"Divi pamatoti darbi saglabājami strukturēti; ūdensvada akas apraksta un kanalizācijas caurules koda pretruna saglabājama pārskatāmā piezīmē.",
		receivedDateISO: "2026-11-18",
		sourceText:
			"2026. gada 13. novembrī ar tranšejas rakšanas metodi iebūvēti 60,87 metri ūdensvada PE100 spiedvada caurules OD63x3,8, PN10, SDR17. Tāmes pozīcija 1.1. Sadzīves kanalizācijai samontēta viena PP skataka DN600 no saliekamiem PP elementiem, aka AK1-6, viens komplekts, pozīcija 2.1. Vēl ūdensvadam uzstādīta viena dzelzsbetona skataka DN1000 no saliekamiem elementiem, aka AŪ1-1, viens komplekts. Šai ūdensvada akai norādu tāmes pozīciju 2.4.",
		tags: [
			"ocelt",
			"derived-scenario",
			"multi-work",
			"forma2",
			"conflicting-reference",
			"partial-recovery",
			"backdated",
		],
		tier: "regression",
		priority: "critical",
		expectedRecords: [
			row("1.1", 60.87, "m", "2026-11-13"),
			row("2.1", 1, "kompl", "2026-11-13"),
			{
				id: "well-reference-needs-review",
				dateISO: "2026-11-13",
				work: "Piezīmes",
				workAlternatives: ["Piezīmes", "Notes"],
				location: null,
				commentSignals: [
					"Jāpārbauda.",
					"dzelzsbetona",
					"DN1000",
					"AŪ1-1",
					"2.4",
				],
				reviewedComment: null,
				amount: null,
				unit: null,
				workers: null,
				hours: null,
				forma2PositionId: null,
				reviewRequired: true,
				quantityAlternatives: [
					{ amount: null, unit: null },
					{ amount: 1, unit: "kompl" },
				],
			},
		],
	},
];

export const oceltScenarioProvenance = {
	...reviewedDiaryCorpus.provenance,
	kind: "derived-scenarios",
	description:
		"Two source-derived test messages shown to the user, using the frozen Ocelt catalog. The second intentionally gives a water well the incompatible sewer-pipe reference 2.4. They are not verbatim historical transcripts.",
};
