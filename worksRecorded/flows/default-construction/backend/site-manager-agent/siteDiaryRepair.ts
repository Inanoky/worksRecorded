import { z } from "zod";
import { createDefaultConstructionDiaryUnitResolver } from "../../lib/site-diary-productivity-settings";
import type { ConfigMap } from "./AIschemas";
import { groundDiarySourceQuotes } from "./diarySourceQuotes";
import { calculationEvidenceSchema } from "./quantityEvidence";
import type { SiteDiaryExtractionCheckerResult } from "./siteDiaryExtractionChecker";
import { normalizeLatvianNumberEvidence } from "./spokenNumberEvidence";

type Row = Record<string, unknown>;
export const diaryRepairFieldSchema = z.enum([
	"Works",
	"Date",
	"Location",
	"Comments",
	"Amounts",
	"Units",
	"WorkersInvolved",
	"TimeInvolved",
]);
export type DiaryRepairField = z.infer<typeof diaryRepairFieldSchema>;
const sourceSpans = () => z.array(z.string().min(1).max(2000)).min(1).max(5);
const number = () => z.union([z.number().nonnegative(), z.null()]);
const text = () => z.union([z.string(), z.null()]);
const calculationEvidence = () =>
	z.union([calculationEvidenceSchema.unwrap().unwrap(), z.null()]);
const repairedRowSchema = () =>
	z.object({
		workCandidateId: z.string().min(1),
		Date: z.string(),
		Location: text(),
		Comments: z.string().max(2000),
		Amounts: number(),
		Units: text(),
		WorkersInvolved: number(),
		TimeInvolved: number(),
		calculationEvidence: calculationEvidence(),
		sourceSpans: sourceSpans(),
	});
export const siteDiaryRepairSchema = z.object({
	changes: z
		.array(
			z.object({
				rowId: z.string(),
				field: diaryRepairFieldSchema,
				value: z.union([z.string(), z.number().finite(), z.null()]),
				sourceSpans: sourceSpans(),
				calculationEvidence: calculationEvidence(),
			}),
		)
		.max(100),
	replacements: z
		.array(
			z.object({
				rowIds: z.array(z.string()).min(1).max(25),
				rows: z.array(repairedRowSchema()).max(25),
			}),
		)
		.max(25),
	additions: z.array(repairedRowSchema()).max(25),
	unresolvedRowIds: z.array(z.string()).max(25),
	reason: z.string().max(600),
});
export type SiteDiaryRepair = z.infer<typeof siteDiaryRepairSchema>;
type Candidate = {
	id: string;
	work: string;
	unit: string | null;
	aliases: string[];
};
type Target = {
	rowId: string;
	row: Row;
	source: string;
	issue: string;
	fields: DiaryRepairField[];
	structural: boolean;
	candidateIds: string[];
};
export type SiteDiaryRepairRequest = {
	source: string;
	originalRows: Row[];
	lockedRowIds: string[];
	targets: Target[];
	candidates: Candidate[];
	additionCandidateIds: string[];
	allowAdditions: boolean;
	expectedRecordCount: number | null;
	referenceDate: string;
	instructions: string;
	units: string[];
	locations: string[];
	locationIsDropdown: boolean;
};

function normalized(value: unknown) {
	return normalizeLatvianNumberEvidence(String(value ?? ""))
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLowerCase();
}

function words(text: string) {
	const vocabulary = normalized(text)
		.replace(/udensvad\p{L}*/gu, " water ")
		.replace(/kanaliz\p{L}*/gu, " sewer ")
		.replace(/caurul\p{L}*|trub\p{L}*/gu, " pipe ")
		.replace(/transej\p{L}*/gu, " trench ")
		.replace(/izrak\p{L}*|raksan\p{L}*/gu, " excavation ")
		.replace(/aizber\p{L}*/gu, " backfilling ")
		.replace(/skatak\p{L}*|\baka\p{L}*/gu, " well ")
		.replace(/dzelzsbet\p{L}*|beton\p{L}*/gu, " concrete ")
		.replace(/polietilen\p{L}*|\bpeh\b/gu, " polyethylene ")
		.replace(/durv\p{L}*/gu, " door ")
		.replace(/sien\p{L}*/gu, " wall ")
		.replace(/kraso\p{L}*/gu, " painting ")
		.replace(/piegad\p{L}*/gu, " delivery ")
		.replace(/material\p{L}*/gu, " material ")
		.replace(/smil\p{L}*/gu, " sand ")
		.replace(/uzstad\p{L}*|iebuv\p{L}*|montaz\p{L}*|iekl\p{L}*/gu, " install ");
	return new Set(
		(vocabulary.match(/\p{L}{3,}/gu) ?? []).map((word) => word.slice(0, 5)),
	);
}

function dimensions(text: string) {
	const input = normalized(text);
	return [
		...input.matchAll(
			/(?:\b(?:od|dn|d)|[ø⌀]|diametr\p{L}*)\s*(\d+(?:[.,]\d+)?)/gu,
		),
		...input.matchAll(
			/\b(\d+(?:[.,]\d+)?)\s*(?:mm|milimetr\p{L}*)(?=$|[^\p{L}\p{N}])/gu,
		),
	].map((match) => Number(match[1].replace(",", ".")));
}

function references(text: string) {
	const result = new Set<string>();
	const input = normalized(text);
	for (const match of input.matchAll(
		/(?:^|[^\p{L}\p{N}.])(\d+(?:[.,]\d+)+)(?=$|[\s.;:])/gu,
	)) {
		const after = input.slice((match.index ?? 0) + match[0].length);
		if (
			/^\s*(?:mm|cm|m[23²³]?|met\p{L}*|kubik\p{L}*|kg|tn|stund\p{L}*)(?=$|[^\p{L}\p{N}])/iu.test(
				after,
			)
		)
			continue;
		result.add(match[1].replace(/,/g, "."));
	}
	return result;
}

export function getSiteDiaryWorkAliases(config: ConfigMap) {
	const works = new Set(Object.values(config.Works?.DropDownOptions ?? {}));
	const settings = config.otherSettings as unknown as
		| Record<string, unknown>
		| undefined;
	const raw = settings?.defaultConstructionWorkAliases;
	if (
		!raw ||
		typeof raw !== "object" ||
		!("entries" in raw) ||
		!Array.isArray(raw.entries)
	)
		return [];
	return raw.entries.flatMap((entry: unknown) => {
		if (
			!entry ||
			typeof entry !== "object" ||
			!("alias" in entry) ||
			!("work" in entry)
		)
			return [];
		if (
			typeof entry.alias !== "string" ||
			typeof entry.work !== "string" ||
			!entry.alias.trim() ||
			entry.alias.length > 160 ||
			!works.has(entry.work)
		)
			return [];
		return [{ alias: entry.alias.trim(), work: entry.work }];
	});
}

export function selectDiaryRepairCandidates(
	config: ConfigMap,
	source: string,
	hint = "",
) {
	const works = [
		...new Set(Object.values(config.Works?.DropDownOptions ?? {})),
	];
	const unitForWork = createDefaultConstructionDiaryUnitResolver(config);
	const aliases = getSiteDiaryWorkAliases(config);
	const query = words(`${source} ${hint}`);
	const specs = dimensions(source);
	const codes = references(source);
	const speech = normalized(source)
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim();
	return works
		.map((work, index) => {
			const workSpecs = dimensions(work);
			if (
				specs.length &&
				workSpecs.length &&
				!workSpecs.some((value) => specs.includes(value))
			)
				return null;
			const workWords = words(work);
			const matchingAliases = aliases.filter(
				(entry) =>
					entry.work === work &&
					` ${speech} `.includes(
						` ${normalized(entry.alias)
							.replace(/[^\p{L}\p{N}]+/gu, " ")
							.trim()} `,
					),
			);
			const code = work.match(/^\d+(?:\.\d+)*/u)?.[0];
			const namedInPlan =
				` ${normalized(hint).replace(/[^\p{L}\p{N}]+/gu, " ")} `.includes(
					` ${normalized(work).replace(/[^\p{L}\p{N}]+/gu, " ")} `,
				);
			const score =
				[...workWords].filter((word) => query.has(word)).length * 5 +
				(code && codes.has(code) ? 100 : 0) +
				matchingAliases.length * 100 +
				(namedInPlan ? 100 : 0);
			return {
				id: `work-${index + 1}`,
				work,
				unit: unitForWork(work) ?? null,
				aliases: matchingAliases.map((entry) => entry.alias),
				score,
			};
		})
		.filter(
			(candidate): candidate is NonNullable<typeof candidate> =>
				candidate !== null,
		)
		.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
		.filter(
			(candidate, index) =>
				(candidate.score > 0 && index < 10) ||
				/^(?:notes?|piezīmes)$/iu.test(candidate.work),
		)
		.map(({ score: _score, ...candidate }) => candidate);
}

export function buildSiteDiaryRepairRequest(args: {
	rows: Row[];
	checker: SiteDiaryExtractionCheckerResult;
	source: string;
	config: ConfigMap;
	referenceDate: string;
}): SiteDiaryRepairRequest {
	const { rows, checker, source, config } = args;
	const lockedRowIds: string[] = [];
	const candidates = new Map<string, Candidate>();
	const targets: Target[] = [];
	for (const [index, row] of rows.entries()) {
		const rowId = `row-${index + 1}`;
		const review = checker.rowReviews?.find((item) => item.rowIndex === index);
		const evidence =
			review &&
			groundDiarySourceQuotes(
				source,
				review.sourceSpans?.length ? review.sourceSpans : [review.sourceText],
				1,
			);
		if (review?.status === "accept" && evidence) {
			lockedRowIds.push(rowId);
			continue;
		}
		const plan = checker.modelRepairTargets?.find(
			(item) => item.rowIndex === index,
		);
		const targetSource = evidence || source;
		const selected = selectDiaryRepairCandidates(
			config,
			targetSource,
			`${row.Works ?? ""} ${review?.reason ?? checker.reason} ${checker.repairInstructions}`,
		);
		for (const candidate of selected) candidates.set(candidate.id, candidate);
		targets.push({
			rowId,
			row: Object.fromEntries(
				[...diaryRepairFieldSchema.options, "calculationEvidence"]
					.filter((field) => row[field] !== undefined)
					.map((field) => [field, row[field]]),
			),
			source: targetSource,
			issue: review?.reason ?? checker.reason,
			fields: plan?.fields ?? diaryRepairFieldSchema.options,
			structural:
				plan?.allowStructuralChanges ??
				(checker.expectedRecordCount != null &&
					checker.expectedRecordCount !== rows.length),
			candidateIds: selected.map((candidate) => candidate.id),
		});
	}
	const allowAdditions = checker.coverageComplete === false;
	const additions = allowAdditions
		? selectDiaryRepairCandidates(config, source, checker.repairInstructions)
		: [];
	for (const candidate of additions) candidates.set(candidate.id, candidate);
	return {
		source,
		originalRows: rows.map((row) => ({ ...row })),
		lockedRowIds,
		targets,
		candidates: [...candidates.values()],
		additionCandidateIds: additions.map((candidate) => candidate.id),
		allowAdditions,
		expectedRecordCount: checker.expectedRecordCount ?? null,
		referenceDate: args.referenceDate,
		instructions: checker.repairInstructions || checker.reason,
		units: [
			...new Set([
				...Object.values(config.Units?.DropDownOptions ?? {}),
				"m",
				"m2",
				"m3",
				"m²",
				"m³",
				"kg",
				"tn",
				"pcs",
				"gab.",
				"set",
				"kompl",
				"hour",
				"minute",
				"package",
				"project",
				"lifts",
			]),
		],
		locations: Object.values(config.Location?.DropDownOptions ?? {}),
		locationIsDropdown: config.Location?.Type === "dropdown",
	};
}

function validateField(
	field: DiaryRepairField,
	value: unknown,
	request: SiteDiaryRepairRequest,
) {
	if (["Amounts", "WorkersInvolved", "TimeInvolved"].includes(field)) {
		if (
			value !== null &&
			(typeof value !== "number" ||
				!Number.isFinite(value) ||
				value < 0 ||
				(field === "WorkersInvolved" && !Number.isInteger(value)))
		)
			throw new Error("REPAIR_INVALID_NUMBER");
	} else if (field === "Date") {
		if (
			typeof value !== "string" ||
			!/^\d{4}-\d{2}-\d{2}(?:T|$)/u.test(value) ||
			!Number.isFinite(new Date(value).getTime()) ||
			new Date(value).toISOString().slice(0, 10) !== value.slice(0, 10)
		)
			throw new Error("REPAIR_INVALID_DATE");
	} else if (field === "Units") {
		if (value !== null && !request.units.includes(String(value)))
			throw new Error("REPAIR_UNKNOWN_UNIT");
	} else if (field === "Location") {
		if (
			value !== null &&
			(typeof value !== "string" ||
				value.length > 2000 ||
				(request.locationIsDropdown && !request.locations.includes(value)))
		)
			throw new Error("REPAIR_UNKNOWN_LOCATION");
	} else if (typeof value !== "string" || value.length > 2000)
		throw new Error("REPAIR_INVALID_TEXT");
}

export function applySiteDiaryRepair(
	request: SiteDiaryRepairRequest,
	input: unknown,
	validateValue?: (
		row: Row,
		field: DiaryRepairField,
		evidence: string,
	) => boolean,
) {
	const repair = siteDiaryRepairSchema.parse(input);
	const targets = new Map(
		request.targets.map((target) => [target.rowId, target]),
	);
	const candidates = new Map(
		request.candidates.map((candidate) => [candidate.id, candidate]),
	);
	const rows = request.originalRows.map((row) => ({ ...row }));
	const touched = new Set<string>();
	const changedFields = new Set<string>();
	const replacements = new Map<string, Row[]>();
	const skipped = new Set<string>();
	const unresolved = new Set(repair.unresolvedRowIds);
	const pendingValidation: Array<{
		row: Row;
		field: DiaryRepairField;
		evidence: string;
	}> = [];
	const target = (id: string) => {
		const found = targets.get(id);
		if (!found || unresolved.has(id))
			throw new Error("REPAIR_ROW_NOT_EDITABLE");
		return found;
	};
	for (const id of unresolved)
		if (!targets.has(id)) throw new Error("REPAIR_UNKNOWN_ROW");
	const evidenceFor = (quotes: string[]) => {
		const evidence = groundDiarySourceQuotes(request.source, quotes, 1);
		if (!evidence) throw new Error("REPAIR_UNGROUNDED_SOURCE");
		return evidence;
	};
	const workFor = (id: string, allowed: string[]) => {
		const work = candidates.get(id);
		if (!work || !allowed.includes(id)) throw new Error("REPAIR_UNKNOWN_WORK");
		return work.work;
	};
	for (const change of repair.changes) {
		const editable = target(change.rowId);
		if (!editable.fields.includes(change.field))
			throw new Error("REPAIR_FIELD_NOT_EDITABLE");
		const key = `${change.rowId}:${change.field}`;
		if (changedFields.has(key)) throw new Error("REPAIR_DUPLICATE_FIELD");
		changedFields.add(key);
		const evidence = evidenceFor(change.sourceSpans);
		const index = Number(change.rowId.slice(4)) - 1;
		const row = rows[index];
		const value =
			change.field === "Works"
				? workFor(String(change.value), editable.candidateIds)
				: change.value;
		validateField(change.field, value, request);
		row[change.field] = value;
		if (change.field === "Amounts" && change.calculationEvidence)
			row.calculationEvidence = change.calculationEvidence;
		pendingValidation.push({ row, field: change.field, evidence });
		touched.add(change.rowId);
	}
	for (const { row, field, evidence } of pendingValidation) {
		if (validateValue && !validateValue(row, field, evidence))
			throw new Error("REPAIR_UNSUPPORTED_VALUE");
	}
	const materialize = (
		draft: z.infer<ReturnType<typeof repairedRowSchema>>,
		allowed: string[],
	) => {
		const evidence = evidenceFor(draft.sourceSpans);
		const { workCandidateId, sourceSpans: _quotes, ...fields } = draft;
		const row: Row = { ...fields, Works: workFor(workCandidateId, allowed) };
		for (const field of diaryRepairFieldSchema.options) {
			validateField(field, row[field], request);
			if (validateValue && !validateValue(row, field, evidence))
				throw new Error("REPAIR_UNSUPPORTED_VALUE");
		}
		return row;
	};
	for (const replacement of repair.replacements) {
		const editable = replacement.rowIds.map(target);
		if (
			new Set(replacement.rowIds).size !== editable.length ||
			editable.some((item) => !item.structural || touched.has(item.rowId))
		)
			throw new Error("REPAIR_INVALID_REPLACEMENT");
		const ids = [...replacement.rowIds].sort(
			(a, b) => Number(a.slice(4)) - Number(b.slice(4)),
		);
		const allowed = [...new Set(editable.flatMap((item) => item.candidateIds))];
		replacements.set(
			ids[0],
			replacement.rows.map((row) => materialize(row, allowed)),
		);
		for (const id of ids) {
			skipped.add(id);
			touched.add(id);
		}
	}
	if (repair.additions.length && !request.allowAdditions)
		throw new Error("REPAIR_ADDITION_NOT_ALLOWED");
	const lockedRowIndexes: number[] = [];
	let outputIndex = 0;
	const merged = rows.flatMap((row, index) => {
		const id = `row-${index + 1}`;
		const next = replacements.get(id) ?? (skipped.has(id) ? [] : [row]);
		if (request.lockedRowIds.includes(id)) lockedRowIndexes.push(outputIndex);
		outputIndex += next.length;
		return next;
	});
	merged.push(
		...repair.additions.map((row) =>
			materialize(row, request.additionCandidateIds),
		),
	);
	if (!merged.length || merged.length > 25)
		throw new Error("REPAIR_INVALID_ROW_COUNT");
	if (
		!unresolved.size &&
		request.expectedRecordCount !== null &&
		merged.length !== request.expectedRecordCount
	)
		throw new Error("REPAIR_EXPECTED_ROW_COUNT");
	if (!touched.size && !repair.additions.length)
		throw new Error("REPAIR_NO_CHANGES");
	return {
		rows: merged,
		lockedRowIndexes,
		touchedRowIds: [...touched],
		unresolvedRowIds: [...unresolved],
		reason: repair.reason,
	};
}
