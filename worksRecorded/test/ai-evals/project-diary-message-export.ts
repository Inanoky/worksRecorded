import type {
	DiaryExtractionEvalCase,
	FrozenDiaryProject,
	ReviewedDiaryCorpus,
} from "./reviewed-diary-cases";
import { reviewedDiaryUnit } from "./reviewed-diary-validators";

function referenceConcerns(
	item: DiaryExtractionEvalCase,
	project: FrozenDiaryProject,
) {
	const works = Object.values(
		(project.config.Works as { DropDownOptions?: Record<string, string> })
			?.DropDownOptions ?? {},
	);
	return item.expectedRecords.flatMap((row) => {
		const position = project.positions.find(
			(candidate) => candidate.id === row.forma2PositionId,
		);
		return [
			...(works.length && !works.includes(row.work)
				? [`Atsauces kategorijas nav pašreizējā darbu sarakstā: ${row.work}.`]
				: []),
			...(row.amount !== null &&
			row.unit &&
			position?.unit &&
			reviewedDiaryUnit(row.unit) !== reviewedDiaryUnit(position.unit)
				? [
						`Ieraksta mērvienība ${row.unit} atšķiras no Forma2 pozīcijas ${position.code} mērvienības ${position.unit}; pārrēķins nav pieņemts.`,
					]
				: []),
		];
	});
}

export function buildProjectDiaryMessageOverview(
	corpora: ReviewedDiaryCorpus[],
	derivedCases: DiaryExtractionEvalCase[],
	derivedProject: FrozenDiaryProject,
) {
	return {
		version: 1,
		purpose:
			"Oriģinālie ievades teksti un atsauces ieraksti salīdzināšanai pēc caseId. Modelim padod input un atbilstošā projekta kontekstu; expectedRecords ir tikai vērtēšanai.",
		provenance:
			"Teksti precīzi pārņemti no esošajām eval kopām pēc sākotnējā autora prefiksa noņemšanas. Pārskatīšanai atliktie pāri nav iekļauti. Šis eksports nepalaiž modeļus un neapliecina ražošanas konteksta atkārtošanu.",
		projects: corpora.map((corpus) => ({
			projectKey: corpus.project.key,
			organization: corpus.provenance.organization,
			name: corpus.provenance.project,
			snapshotDate: corpus.provenance.snapshotDate,
			sourceFile: `test/fixtures/ai-evals/${corpus.project.key}-project-diary.json`,
			messageCount: corpus.cases.length,
			expectedRecordCount: corpus.cases.reduce(
				(sum, item) => sum + item.expectedRecords.length,
				0,
			),
			context: corpus.project,
		})),
		originalMessageCases: corpora.flatMap((corpus) =>
			corpus.cases.map(({ id, sourceText, receivedDateISO, ...reference }) => ({
				caseId: id,
				projectKey: corpus.project.key,
				input: { sourceText, receivedDateISO },
				...reference,
				referenceConcerns: referenceConcerns(
					{ id, sourceText, receivedDateISO, ...reference },
					corpus.project,
				),
			})),
		),
		derivedScenarios: {
			description:
				"Divi atvasināti Ocelt scenāriji no eval:ai:ocelt; tie nav oriģināli vēsturiski ziņojumi un nav daļa no 31 ziņas projektu etalona. Saglabāts šo scenāriju atsevišķais kataloga momentuzņēmums.",
			sourceFile: "test/ai-evals/ocelt-scenario-cases.ts",
			context: derivedProject,
			cases: derivedCases.map(
				({ id, sourceText, receivedDateISO, ...reference }) => ({
					caseId: id,
					projectKey: "ocelt",
					input: { sourceText, receivedDateISO },
					...reference,
				}),
			),
		},
	};
}

export function renderProjectDiaryMessageList(
	overview: ReturnType<typeof buildProjectDiaryMessageOverview>,
) {
	const value = (item: string | number | null) =>
		item ?? "null (lauks nav aizpildīts)";
	const cases = (
		items: Array<{
			caseId: string;
			input: { sourceText: string; receivedDateISO: string };
			expectedRecords: DiaryExtractionEvalCase["expectedRecords"];
			referenceConcerns?: string[];
		}>,
		project: FrozenDiaryProject,
	) =>
		items.flatMap((item, index) => [
			`${index + 1}. ${item.caseId}`,
			`Saņemšanas/atsauces datums: ${item.input.receivedDateISO}. Sagaidāmie ieraksti: ${item.expectedRecords.length}.`,
			"",
			"IEVADES ZIŅA (bez pārfrāzēšanas):",
			item.input.sourceText,
			"",
			"SAGAIDĀMIE ATSAUCES IERAKSTI:",
			...item.expectedRecords.map((row, rowIndex) => {
				const position = project.positions.find(
					(candidate) => candidate.id === row.forma2PositionId,
				);
				return `${rowIndex + 1}) ${row.work}\n   Darba datums: ${row.dateISO}; vieta: ${value(row.location)}; apjoms: ${value(row.amount)}; mērvienība: ${value(row.unit)}; darbinieki: ${value(row.workers)}; ilgums stundās: ${value(row.hours)}.\n   Forma2: ${position ? `${position.code} / ${position.categoryName} / ${position.name} (${position.unit})` : "nav piesaistes"}${row.reviewRequired ? "; nepieciešama pārbaude" : ""}.${row.reviewedComment ? `\n   Atsauces komentārs: ${row.reviewedComment}` : ""}${row.commentSignals.length ? `\n   Pārbaudāmie komentāra signāli: ${row.commentSignals.join("; ")}` : ""}`;
			}),
			...(item.referenceConcerns?.length
				? ["", "ATSAUCES KONFIGURĀCIJAS ATŠĶIRĪBAS:", ...item.referenceConcerns]
				: []),
			"",
			"----------------------------------------------------------------",
			"",
		]);
	return [
		"AI EKSTRAKTORA UN ČEKERA ORIĢINĀLO ZIŅU SARAKSTS",
		"",
		overview.provenance,
		"",
		`${overview.originalMessageCases.length} oriģinālas ziņas; ${overview.projects.reduce((sum, project) => sum + project.expectedRecordCount, 0)} sagaidāmie ieraksti; ${overview.derivedScenarios.cases.length} atvasināti scenāriji atsevišķā pielikumā.`,
		"Saņemšanas datums var atšķirties no ieraksta darba datuma. Atsauces null nozīmē neaizpildītu lauku, nevis 0; avota fakti jāpārbauda ziņas tekstā. Atsauces nav pārveidotas, lai novērstu neatbilstības ar katalogu.",
		"",
		...overview.projects.flatMap((project) => [
			`${project.organization} / ${project.name}`,
			`Momentuzņēmums: ${project.snapshotDate}; ziņas: ${project.messageCount}; ieraksti: ${project.expectedRecordCount}; Forma2 pozīcijas: ${project.context.positions.length}.`,
			`Avots: ${project.sourceFile}`,
			"",
			...cases(
				overview.originalMessageCases.filter(
					(item) => item.projectKey === project.projectKey,
				),
				project.context,
			),
		]),
		"PIELIKUMS: DIVI ATVASINĀTI OCELT SCENĀRIJI",
		overview.derivedScenarios.description,
		"",
		...cases(
			overview.derivedScenarios.cases,
			overview.derivedScenarios.context,
		),
	].join("\n");
}
