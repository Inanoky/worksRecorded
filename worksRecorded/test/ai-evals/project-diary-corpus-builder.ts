import { createHash } from "node:crypto";
import { ReviewedDiaryCorpusSchema } from "./reviewed-diary-cases";

export const diaryFingerprint = (value: string) =>
	createHash("sha256").update(value).digest("hex");
export const diaryOriginalInput = (value: string) =>
	value.replace(/^[\p{L}\p{M} .'-]{2,80}\s*:\s*/u, "").trim();

type SnapshotRow = {
	id: string;
	Date: string | null;
	Works: string | null;
	Location: string | null;
	Comments: string | null;
	Amounts: number | null;
	Units: string | null;
	WorkersInvolved: number | null;
	TimeInvolved: number | null;
	saveBatchId: string | null;
	archivedAt: string | null;
};
type Batch = {
	id: string;
	originalText: string;
	createdAt: string;
	receivedAt: string | null;
	status: string;
};
type Position = {
	id: string;
	code: string;
	name: string;
	categoryName: string;
	categoryCode: string;
	kind: "work" | "material";
	parentId: string | null;
	sourceRow: number;
	unit: string;
	manualAssignmentOnly?: boolean;
};
export type DiaryProjectSnapshot = {
	siteId: string;
	siteName: string;
	organizationName: string;
	orgLanguage: string;
	config: Record<string, unknown>;
	batches: Batch[];
	records: SnapshotRow[];
	forma2: {
		document?: { id: string; positions: Position[] };
		allocations?: Array<{ sourceId: string; positionId: string }>;
	} | null;
	corrections: Array<{ oldBatchId: string; newBatchId: string }>;
};
export type DiaryCorpusSelection = {
	key: string;
	siteFingerprint: string;
	cases: Array<{
		batchFingerprint: string;
		id: string;
		tags: string[];
		intent: string;
	}>;
};

const isoDate = (value: string) => value.slice(0, 10);
const timestamp = (value: string) =>
	new Date(/(?:Z|[+-]\d{2}:\d{2})$/u.test(value) ? value : `${value}Z`);
const receivedDate = (batch: Batch) =>
	new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Riga" }).format(
		timestamp(batch.receivedAt ?? batch.createdAt),
	);
const normalized = (value: string) =>
	value.toLocaleLowerCase("lv").replace(/\s+/gu, "").trim();

export function buildProjectDiaryCorpus(
	snapshot: DiaryProjectSnapshot,
	selection: DiaryCorpusSelection,
	snapshotDate = new Date().toISOString().slice(0, 10),
) {
	if (diaryFingerprint(snapshot.siteId) !== selection.siteFingerprint)
		throw new Error(
			"Project snapshot does not match the selected site fingerprint",
		);
	const document = snapshot.forma2?.document;
	const positionIds = new Map(
		(document?.positions ?? []).map((position) => [
			position.id,
			`pos:${selection.key}:${diaryFingerprint(position.id).slice(0, 20)}`,
		]),
	);
	const positions = (document?.positions ?? []).map((position) => ({
		id: positionIds.get(position.id) as string,
		code: position.code,
		name: position.name,
		categoryName: position.categoryName,
		categoryCode: position.categoryCode,
		kind: position.kind,
		parentId: position.parentId
			? (positionIds.get(position.parentId) ?? null)
			: null,
		sourceRow: position.sourceRow,
		unit: position.unit,
		...(position.manualAssignmentOnly ? { manualAssignmentOnly: true } : {}),
	}));
	const redact = (value: unknown): unknown => {
		if (typeof value === "string")
			return (
				positionIds.get(value) ??
				value.replace(
					/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/giu,
					(id) => `snapshot:${diaryFingerprint(id).slice(0, 16)}`,
				)
			);
		if (Array.isArray(value)) return value.map(redact);
		if (value && typeof value === "object")
			return Object.fromEntries(
				Object.entries(value).map(([key, item]) => [key, redact(item)]),
			);
		return value;
	};
	const config = Object.fromEntries(
		Object.entries(snapshot.config).flatMap(([key, raw]) => {
			if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
			const field = raw as Record<string, unknown>;
			if (key === "otherSettings")
				return [
					[
						key,
						redact(
							Object.fromEntries(
								Object.entries(field).filter(([name]) =>
									[
										"Type",
										"defaultConstructionForma2WorkSync",
										"defaultConstructionProductivity",
										"defaultConstructionWorkAliases",
										"defaultConstructionDiaryProjectRules",
									].includes(name),
								),
							),
						),
					],
				];
			if (key === "AIpromptToUse")
				return [[key, { Type: field.Type, Client: field.Client }]];
			return [
				[
					key,
					{
						Type: field.Type,
						...(field.DisplayName ? { DisplayName: field.DisplayName } : {}),
						...(field.DropDownOptions
							? {
									DropDownOptions: Object.fromEntries(
										Object.values(
											field.DropDownOptions as Record<string, string>,
										).map((option, index) => [`option-${index + 1}`, option]),
									),
								}
							: {}),
						...(field.customSettings
							? {
									customSettings: Object.fromEntries(
										Object.entries(
											field.customSettings as Record<string, unknown>,
										).filter(([name]) =>
											["integer", "aiDescription"].includes(name),
										),
									),
								}
							: {}),
					},
				],
			];
		}),
	);
	const other = config.otherSettings as Record<string, unknown> | undefined;
	const manifest = other?.defaultConstructionForma2WorkSync as
		| {
				documentId: string;
				entries: Array<{ work: string; positionId: string }>;
		  }
		| undefined;
	if (manifest) manifest.documentId = `eval:${selection.key}:catalog-v1`;
	const byWork = new Map(
		(manifest?.entries ?? []).map((entry) => [
			normalized(entry.work),
			entry.positionId,
		]),
	);
	const allocated = new Map(
		(snapshot.forma2?.allocations ?? [])
			.filter((item) => positionIds.has(item.positionId))
			.map((item) => [
				item.sourceId,
				positionIds.get(item.positionId) as string,
			]),
	);
	const selected = new Map(
		selection.cases.map((item) => [item.batchFingerprint, item]),
	);
	const latest = Math.max(
		...snapshot.batches.map((batch) => timestamp(batch.createdAt).getTime()),
	);
	const inWindow = snapshot.batches.filter(
		(batch) => timestamp(batch.createdAt).getTime() >= latest - 30 * 86400000,
	);
	const expectedFor = (batch: Batch) =>
		snapshot.records
			.filter((row) => row.saveBatchId === batch.id && !row.archivedAt)
			.map((row, index) => {
				const positionId =
					allocated.get(row.id) ??
					byWork.get(normalized(row.Works ?? "")) ??
					null;
				const position = positions.find((item) => item.id === positionId);
				return {
					id: `reference-${index + 1}`,
					dateISO: row.Date ? isoDate(row.Date) : receivedDate(batch),
					work: row.Works ?? "(nav darba kategorijas)",
					location: row.Location || null,
					commentSignals: [],
					reviewedComment: row.Comments,
					amount: row.Amounts,
					unit: row.Units || null,
					workers: row.WorkersInvolved,
					hours: row.TimeInvolved,
					forma2PositionId: positionId,
					checkLocation: row.Location
						? normalized(diaryOriginalInput(batch.originalText)).includes(
								normalized(row.Location),
							) ||
							(/^plan\d+$/iu.test(normalized(row.Location)) &&
								[
									...batch.originalText.matchAll(
										/pl[aā]n\s*\d+(?:\s*(?:,|un)\s*(?:pl[aā]n\s*)?\d+)*/giu,
									),
								].some((match) =>
									(match[0].match(/\d+/gu) ?? ([] as string[])).includes(
										row.Location?.match(/\d+/u)?.[0] ?? "",
									),
								))
						: !/plan\s*\d+/iu.test(batch.originalText),
					...(row.Amounts === null && !row.Units && position?.unit
						? {
								quantityAlternatives: [
									{ amount: null, unit: null },
									{ amount: null, unit: position.unit },
								],
							}
						: {}),
					provenance: {
						recordFingerprint: diaryFingerprint(row.id),
						assignmentBasis: allocated.has(row.id)
							? "stored-allocation"
							: positionId
								? "journal-work-selection"
								: "not-assigned",
					},
				};
			});
	const cases = inWindow.flatMap((batch) => {
		const chosen = selected.get(diaryFingerprint(batch.id));
		if (!chosen) return [];
		const sourceText = diaryOriginalInput(batch.originalText);
		const expectedRecords = expectedFor(batch);
		if (!expectedRecords.length)
			throw new Error(
				`Selected batch has no current reference rows: ${chosen.id}`,
			);
		if (/\nCorrection:/u.test(sourceText))
			throw new Error(`Selected batch needs correction context: ${chosen.id}`);
		return [
			{
				id: chosen.id,
				intent: chosen.intent,
				tags: [
					selection.key,
					"real-message",
					"full-message",
					"project-reference",
					expectedRecords.length > 1 ? "multi-work" : "single-work",
					positions.length ? "forma2" : "no-forma2",
					...chosen.tags,
				],
				tier: expectedRecords.length > 1 ? "regression" : "smoke",
				priority: "critical",
				receivedDateISO: receivedDate(batch),
				sourceKind: "full-message",
				sourceText,
				sourceFingerprint: diaryFingerprint(batch.id),
				sourceTextFingerprint: diaryFingerprint(batch.originalText),
				inputFingerprint: diaryFingerprint(sourceText),
				expectedRecords,
			},
		];
	});
	if (cases.length !== selection.cases.length)
		throw new Error(`Missing selected batches for ${selection.key}`);
	const referenceCandidates = inWindow
		.filter((batch) => !selected.has(diaryFingerprint(batch.id)))
		.map((batch, index) => {
			const rows = snapshot.records.filter(
				(row) => row.saveBatchId === batch.id && !row.archivedAt,
			);
			const issues = [];
			if (!rows.length) issues.push("no-current-reference-rows");
			if (
				/\nCorrection:/u.test(batch.originalText) ||
				snapshot.corrections.some(
					(item) =>
						item.oldBatchId === batch.id || item.newBatchId === batch.id,
				)
			)
				issues.push("requires-correction-history");
			if (rows.some((row) => row.Amounts === 0))
				issues.push("legacy-zero-quantity");
			if (
				rows.some((row) => row.TimeInvolved !== null) &&
				!/stund|\d\s*h\b|līdz|no\s*\d/iu.test(batch.originalText)
			)
				issues.push("duration-not-stated-in-message");
			if (rows.some((row) => !row.Works)) issues.push("missing-work-category");
			if (
				/ievest|piegād/iu.test(batch.originalText) &&
				/iestrād|aizbēr/iu.test(batch.originalText) &&
				rows.length === 1
			)
				issues.push("delivery-and-installation-need-separate-review");
			if (!issues.length) issues.push("outside-initial-reviewed-selection");
			return {
				id: `${selection.key}-review-${index + 1}`,
				sourceText: diaryOriginalInput(batch.originalText),
				receivedDateISO: receivedDate(batch),
				sourceFingerprint: diaryFingerprint(batch.id),
				issues,
				expectedRecords: expectedFor(batch),
			};
		});
	const dates = cases
		.flatMap((item) => item.expectedRecords.map((row) => row.dateISO))
		.sort();
	return ReviewedDiaryCorpusSchema.parse({
		version: 1,
		provenance: {
			organization: snapshot.organizationName,
			project: snapshot.siteName,
			periodStart: dates[0],
			periodEnd: dates.at(-1),
			sourcePeriodStart: inWindow.map(receivedDate).sort()[0],
			sourcePeriodEnd: inWindow.map(receivedDate).sort().at(-1),
			snapshotDate,
			sourceSiteFingerprint: selection.siteFingerprint,
			reviewBasis:
				"Lietotāja norādītā projekta pašreizējie izlabotie ieraksti; oriģinālie teksti no SiteDiarySaveBatch. Sākotnējā vērtējamā atlase neizmanto neizteiktas 10 stundu/0 apjoma noklusējuma vērtības vai labojumu vēsturi bez konteksta. Neizvēlētie pāri ir tikai pārskatīšanai. method=manual pats par sevi nav cilvēka apstiprinājuma pierādījums.",
			redactions: [
				"author name prefix",
				"production identity and transport IDs",
				"photos/audio URLs",
				"UI-only project settings",
				"production document/position IDs replaced with project-scoped snapshot IDs",
			],
		},
		project: {
			key: selection.key,
			language: snapshot.orgLanguage || "lv",
			documentId: `eval:${selection.key}:catalog-v1`,
			config,
			positions,
		},
		cases,
		referenceCandidates,
	});
}
