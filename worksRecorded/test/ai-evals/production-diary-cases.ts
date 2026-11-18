import type { ConfigMap } from "@/flows/default-construction/backend/site-manager-agent/AIschemas";
import environment from "@/test/fixtures/ai-evals/production-diary-environment.json";
import {
	type DiaryExtractionEvalCase,
	reviewedDiaryCorpus,
} from "./reviewed-diary-cases";

function catalogWork(code: string) {
	const work = environment.workOptions.find((work) =>
		work.startsWith(`${code} `),
	);
	if (!work) throw new Error(`Missing production catalog work ${code}`);
	return work;
}
const pipe = catalogWork("1.1");
const well = catalogWork("1.4");
type ExpectedRow = DiaryExtractionEvalCase["expectedRecords"][number];

function row(
	work: string,
	amount: number | null,
	unit: string | null,
	rest: Partial<ExpectedRow> = {},
): ExpectedRow {
	return {
		id: work,
		dateISO: "2026-11-17",
		work,
		location: null,
		commentSignals: [],
		reviewedComment: null,
		amount,
		unit,
		workers: null,
		hours: null,
		forma2PositionId:
			reviewedDiaryCorpus.project.positions.find(
				(position) =>
					`${position.code} ${position.categoryName} - ${position.name}` ===
					work,
			)?.id ?? null,
		...(work === "Notes" ? { workAlternatives: ["Notes", "Piezīmes"] } : {}),
		...rest,
	};
}

function testCase(
	id: string,
	intent: string,
	sourceText: string,
	expectedRecords: ExpectedRow[],
): DiaryExtractionEvalCase {
	return {
		id,
		intent,
		sourceText,
		expectedRecords,
		receivedDateISO: "2026-11-17",
		tags: [
			"production-replay",
			"forma2",
			"multi-work",
			"english-categories",
			"truncated-context",
		],
		tier: "regression",
		priority: "critical",
	};
}

export const productionDiaryCases = [
	testCase(
		"production-water-excavation-conflicting-lengths",
		"Saglabāt ūdensvadu ar tam tieši sekojošajā teikumā norādīto darba laiku; pretrunīgo rakšanas apjomu atzīmēt pārskatīšanai, nepiesaistot kanalizācijas pozīcijai.",
		"Iebūvēts ūdensvads D63 diametra posmā no Akas AU1-4 virzienā uz sadzīves kanalizācijas aku AK1-6. 22,09 metru apjomā. Tāmes pozīcija ir 1.1. darba veids. Darbus veica divi cilvēki, astoņas stundas, un tranšejas rakšana tika veikta uz vienu tekošo metru, 3 kubikmetri grunts. Lūdzu sareizini šo apjomu un izveido ikdienas darba ierakstu, kur atspoguļojas kopējais izraktais grunts daudzums uz šiem 22,9 metriem.",
		[
			row(pipe, 22.09, "m", { workers: 2, hours: 8 }),
			row("Notes", null, null, { id: "rakšana", commentSignals: ["rakšan"] }),
		],
	),
	testCase(
		"production-four-utilities-english-categories",
		"Saglabāt četras atsevišķas darbības un OD220 nemainīt uz D200; kanalizācijas akai bez specifikācijas izmantot pamatotu vispārīgo kategoriju vai piezīmi.",
		"Tātad vēl šodien iebūvētas atzīves kanalizācijas aka AK1, svītriņa 7 un kanalizācijas caurulē 220 mm virzienā uz aku AK1, svītriņa 6, un paralēli tranšejā blakus ierakts arī ūdensvada diametrā 63 polietilēns. Un iebūvēt ūdensvada aka dzelzsbetona diametrā tūkstošā ar numuru AU1, svītriņa 4. Ūdensvads arī iebūvēts 22 metri, sākot no tās akas virzienā uz to pašu sadzīves kanalizācijas aku AK1, 6.",
		[
			row("Notes", null, null, {
				commentSignals: ["kanaliz"],
				workAlternatives: ["Notes", "Piezīmes", "Plumbing installation"],
			}),
			row("Utility pipe laying", null, null, { commentSignals: ["220"] }),
			row(well, null, "kompl"),
			row(pipe, 22, "m"),
		],
	),
	testCase(
		"production-distinct-works-shared-labour",
		"Atdalīt divus izmērāmus darbus, aprēķināt rakšanu un kopīgās astoņas stundas saglabāt vienreiz.",
		"Šodien iebūvēts ūdensvads PE100 OD63, tāmes pozīcija 1.1, 22,09 metri. Ūdensvada tranšejai izrakti 3 kubikmetri grunts uz katru no šiem 22,09 metriem; aprēķini kopējo rakšanas apjomu. Abus darbus kopā veica divi cilvēki astoņas stundas kopā; pa darbiem laiks nav sadalīts.",
		[
			row(pipe, 22.09, "m"),
			row("Trenching", 66.27, "m3", {
				workAlternatives: ["Trenching", "Excavation"],
			}),
			row("Notes", null, null, { workers: 2, hours: 8 }),
		],
	),
	testCase(
		"production-work-specific-labour",
		"Saglabāt katra atsevišķā darba paša brigādi un ilgumu bez kopīgas darba laika piezīmes.",
		"Šodien iebūvēts ūdensvads PE100 OD63, tāmes pozīcija 1.1, 22 metri. Ūdensvadu iebūvēja divi cilvēki piecas stundas. Ūdensvada tranšejai izrakti 66 kubikmetri grunts; rakšanu veica viens cilvēks trīs stundas.",
		[
			row(pipe, 22, "m", { workers: 2, hours: 5 }),
			row("Trenching", 66, "m3", { workers: 1, hours: 3 }),
		],
	),
];

export function productionDiaryEnvironment(evalCase: DiaryExtractionEvalCase) {
	const config = JSON.parse(
		JSON.stringify(reviewedDiaryCorpus.project.config),
	) as ConfigMap;
	config.Works.DropDownOptions = Object.fromEntries(
		environment.workOptions.map((work) => [work, work]),
	);
	const references = Array.from(
		{ length: 5 },
		(_, index) =>
			`Reference item ${index + 1}: Date: 2026-11-16; Works: Painting; Comments: Testa vēsturiskā atskaite par sienu krāsošanu. ${"Nav pašreizējās atskaites faktu avots. ".repeat(14)} Amounts: 32; Units: m2; WorkersInvolved: 7; TimeInvolved: 2`,
	).join("\n");
	const raw = `Trusted extraction context:\nCurrent message preview: ${evalCase.sourceText.slice(0, 500)}\nCurrentMessageHasExplicitContextReference: ${evalCase.id.includes("four-utilities")}\n${environment.schemaContext}\nRecent trusted reference items for this site/user:\n${references}`;
	return {
		config,
		extractionContext: {
			text: `${raw.slice(0, 11900)}\n[context truncated to bounded extraction budget]`,
			metadata: {
				recentRecordCount: 5,
				hasExplicitContextReference: evalCase.id.includes("four-utilities"),
				schemaOptionCount: 123,
				truncated: true,
			},
		},
	};
}

export const productionDiaryProvenance = environment.provenance;
