import type { ConfigMap } from "./AIschemas";

type DiaryRow = Record<string, unknown>;

function parseWorkdayNote(source: string) {
	const match = source
		.trim()
		.match(
			/^(?:(?:šodien|vakar)\s+)?(?:strādājam|strādājām|strādāju|strādāja|darba\s+laiks)\s*(?:ir\s+)?(?:no\s+)?(?:plkst\.?\s*)?(\d{1,2})[.:]([0-5]\d)\s*(?:[-–—]|līdz)\s*(?:plkst\.?\s*)?(\d{1,2})[.:]([0-5]\d)\s*\.?$/iu,
		);
	if (!match) return null;
	const startHour = Number(match[1]);
	const endHour = Number(match[3]);
	if (startHour > 23 || endHour > 23) return null;
	const start = startHour * 60 + Number(match[2]);
	const end = endHour * 60 + Number(match[4]);
	return {
		comments: source.trim(),
		hours:
			end > start ? Math.round(((end - start) / 60) * 10000) / 10000 : null,
	};
}

function isNotesCategory(value: unknown) {
	return (
		typeof value === "string" && /^(?:notes?|piezīmes?)$/iu.test(value.trim())
	);
}

export function normalizeWorkdayNoteRows(
	rows: DiaryRow[],
	source: string,
	config: ConfigMap,
) {
	const note = parseWorkdayNote(source);
	if (!note || rows.length !== 1) return rows;
	const category = Object.values(config.Works?.DropDownOptions ?? {}).find(
		isNotesCategory,
	);
	if (!category || config.Comments?.Type !== "textInput") return rows;
	return [
		{
			Date: rows[0].Date,
			Works: category,
			Comments: note.comments,
			Location: null,
			Amounts: null,
			Units: null,
			WorkersInvolved: null,
			TimeInvolved: config.TimeInvolved?.Type === "float" ? note.hours : null,
		},
	];
}

export function acceptSourceBackedWorkdayNote(
	rows: DiaryRow[],
	source: string,
) {
	const note = parseWorkdayNote(source);
	if (!note || rows.length !== 1) return null;
	const row = rows[0];
	if (!isNotesCategory(row.Works) || row.Comments !== note.comments)
		return null;
	const nullableFields = ["Location", "Amounts", "Units", "WorkersInvolved"];
	if (nullableFields.some((field) => row[field] != null)) return null;
	if (row.TimeInvolved != null && row.TimeInvolved !== note.hours) return null;
	const allowedFields = new Set([
		"Date",
		"Works",
		"Comments",
		"TimeInvolved",
		...nullableFields,
	]);
	if (
		Object.entries(row).some(
			([field, value]) => !allowedFields.has(field) && value != null,
		)
	)
		return null;
	return {
		rows,
		reason:
			"Accepted source-backed workday note: original working-time report preserved without invented work, location, quantity, or worker count.",
	};
}
