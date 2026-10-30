import type { ConfigMap } from "./AIschemas";

type DiaryRow = Record<string, unknown>;

const planned =
	/(?:^|[^\p{L}])(?:rīt|plānojam|plānots|plānoti|tomorrow|planned|will\s+be)(?=$|[^\p{L}])/iu;
const completed =
	/(?:iestrādāti|iestrādāts|iestrādāta|izplanēti|izplanēts|ieklāts|ieklāti|pabeigti|pabeigts|veikti|piegādāta|delivered|completed|installed)/iu;

export const DIARY_SOURCE_POLICY = `Except in explicit NoSorting/comment-only mode, validate every fact against its own activity clause, including corrected batches. Weather temperatures, platform numbers and ordinal foundation numbers are never completed quantities. A source saying "6.perona 2.pamatnes" means platform 6 / second foundation unless the user explicitly counts completed foundations; do not invent two foundations.
Future intentions such as "rīt jāizplanē 60m3" are planning notes, not factual completed quantities. Keep them as Notes/Piezīmes with planned scope in Comments and null Amounts/Units/Workers/Hours; do not count them again when completion is reported. In a mixed report preserve today's completed work separately from tomorrow's plan.
Extract all unambiguous clauses even when another clause lacks a material or unit. Do not turn an entire measurable report into a raw note solely because one delivery is ambiguous. Preserve the ambiguous clause as a review note without guessing its unit or material.
Preserve every explicitly stated labour duration in structured fields. When people worked different durations, use separate labour notes for each duration group, with null Amounts/Units and no duplicate labour on work rows. Never use the longest duration for everyone and never invent how shared labour was split between jobs. A compound role such as "būvdarbu vad. palīgs" is one person, not a manager plus an assistant.
Use an explicitly reported activity/completion date, not the receipt date, for a retrospective report. A correction changes only its requested facts; preserve unrelated dates, quantities and activities. Verify work category AND configured unit; never convert m2 to m3 without explicit dimensional evidence. If no compatible estimate position exists, retain the measured scope in a review note rather than claiming it belongs to an incompatible estimate position.
A short material-only reply, such as "Balasta", may clarify a preceding unclassified report; it is not evidence of a new completed job. Resolve it through the correction flow only when the target is unambiguous, otherwise ask which report it clarifies.`;

export function isOnlyPlannedDiaryReport(source: string) {
	return planned.test(source) && !completed.test(source);
}

export function isMaterialOnlyDiaryClarification(source: string) {
	return /^(?:balast(?:a|s)?|šķemb(?:a|as|u)|beton(?:s|a)?|smilt(?:s|is|i)|ģeotekstil(?:s|a|u))[.!\s]*$/iu.test(
		source.trim(),
	);
}

export function canClarifyPreviousDiaryReport(
	target: {
		batch: { createdAt: Date };
		records: Array<{
			Works?: string | null;
			Amounts?: number | null;
			BISId?: string | null;
		}>;
	} | null,
	now = Date.now(),
) {
	if (!target || target.records.length !== 1) return false;
	const age = now - new Date(target.batch.createdAt).getTime();
	const row = target.records[0];
	return (
		age >= 0 &&
		age <= 15 * 60 * 1000 &&
		!row.BISId &&
		/^(?:piezīmes|notes?)$/iu.test(row.Works ?? "") &&
		typeof row.Amounts === "number" &&
		row.Amounts > 0
	);
}

function isPlannedDiaryRow(row: DiaryRow, source: string) {
	if (
		isOnlyPlannedDiaryReport(source) ||
		planned.test(String(row.Comments ?? ""))
	)
		return true;
	if (typeof row.Amounts !== "number" || !row.Units) return false;
	const number = String(row.Amounts).replace(".", "[.,]");
	const unit = String(row.Units).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const quantity = new RegExp(
		`(?:^|[^\\d])${number}\\s*${unit}(?=$|[^\\p{L}\\p{N}])`,
		"iu",
	);
	const clauses = source.split(/[.!?;\n](?!\d)|,\s*(?=rīt|tomorrow)/iu);
	return (
		clauses.some((clause) => planned.test(clause) && quantity.test(clause)) &&
		!clauses.some(
			(clause) =>
				!planned.test(clause) &&
				completed.test(clause) &&
				quantity.test(clause),
		)
	);
}

export function isContextOnlyDiaryAmount(row: DiaryRow, source: string) {
	const comment = String(row.Comments ?? "").trim();
	if (
		/^(?:laikapstākļi|laika apstākļi|temperatūra|weather|temperature)\s*[:—-]/iu.test(
			comment,
		)
	)
		return true;
	if (row.Units == null || row.Units === "") {
		if (
			/(?:strādāja|strādājoš|worked|darba laiks)/iu.test(comment) &&
			!/(?:iestrād|ieklā|samont|izbūv|uzstād|piegād)/iu.test(comment)
		)
			return true;
		const amount = Number(row.Amounts);
		if (
			Number.isFinite(amount) &&
			new RegExp(
				`(?:^|[^\\d])${amount}\\.\\s*(?:peron|pamatn|platform)`,
				"iu",
			).test(source)
		)
			return true;
	}
	return false;
}

export function normalizeDiarySourceRows(
	rows: DiaryRow[],
	source: string,
	config: ConfigMap,
) {
	const notes = Object.values(config.Works?.DropDownOptions ?? {}).find(
		(value) => /^(?:piezīmes|notes?)$/iu.test(value),
	);
	rows = rows.map((row) =>
		notes && isPlannedDiaryRow(row, source)
			? {
					...row,
					Works: notes,
					Comments: `Plānots: ${String(row.Comments || source)}`,
					Amounts: null,
					Units: null,
					WorkersInvolved: null,
					TimeInvolved: null,
				}
			: row,
	);
	const settings = config.otherSettings as unknown as
		| {
				defaultConstructionProductivity?: {
					works?: Array<{ work: string; unit: string }>;
				};
		  }
		| undefined;
	const unitKey = (value: unknown) =>
		String(value ?? "")
			.trim()
			.toLowerCase()
			.replace(/²/g, "2")
			.replace(/³/g, "3");
	rows = rows.map((row) => {
		const rule = settings?.defaultConstructionProductivity?.works?.find(
			(rule) => rule.work === row.Works,
		);
		if (
			!notes ||
			!rule?.unit ||
			!row.Units ||
			unitKey(rule.unit) === unitKey(row.Units)
		)
			return row;
		return {
			...row,
			Works: notes,
			Comments: `Jāprecizē darba piesaiste: apjoms norādīts ${row.Units}, bet likmei ir ${rule.unit}. ${String(row.Comments ?? "")}`,
		};
	});
	if (rows.length !== 1) return rows;
	const explicit = source.match(
		/(?:pabeig\p{L}*|veikt\p{L}*)\s+(\d{1,2})\.(\d{1,2})\.(?:(\d{4}))?/iu,
	);
	if (!explicit) return rows;
	const anchor = new Date(String(rows[0].Date ?? ""));
	const year = explicit[3] ? Number(explicit[3]) : anchor.getUTCFullYear();
	if (!Number.isFinite(year)) return rows;
	const date = new Date(
		Date.UTC(year, Number(explicit[2]) - 1, Number(explicit[1])),
	);
	if (
		date.getUTCMonth() !== Number(explicit[2]) - 1 ||
		date.getUTCDate() !== Number(explicit[1])
	)
		return rows;
	return [{ ...rows[0], Date: date.toISOString() }];
}
