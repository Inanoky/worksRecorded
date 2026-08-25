"use server";

import { prisma } from "@/lib/utils/db";
import {
	type ConfigMap,
	getAiFieldDescription,
	type MapField,
} from "./AIschemas";

type SiteDiaryExtractionContextArgs = {
	siteId: string;
	userId: string;
	requestedDate?: string | Date | null;
	sourceText: string;
	config: ConfigMap;
};

export type SiteDiaryExtractionContextMetadata = {
	recentRecordCount: number;
	hasExplicitContextReference: boolean;
	schemaOptionCount: number;
	truncated: boolean;
};

export type SiteDiaryExtractionContext = {
	text: string;
	metadata: SiteDiaryExtractionContextMetadata;
};

const TIME_ZONE = "Europe/Riga";
const MAX_RECENT_RECORDS = 5;
const MAX_FIELD_CHARS = 500;
const MAX_CONTEXT_CHARS = 12_000;
const MAX_DROPDOWN_OPTIONS_PER_FIELD = 120;
const EXPLICIT_CONTEXT_REFERENCE_PATTERN =
	/\b(tas pats|tajā pašā|tai pašā|to pašu|tā pati|tāpat|turpat|vēl|kā vakar|vakarēj|iepriekšēj|turpin(?:āj|a|āt|ām)?|same work|same place|same as yesterday|previous|continue)\b/iu;

function compact(value: unknown, maxLength = MAX_FIELD_CHARS) {
	const text = String(value ?? "")
		.replace(/\s+/g, " ")
		.trim();
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function safeDisplayKey(value: string) {
	return value.trim().replace(/\s+/g, "_").replace(/[^\w]/g, "");
}

function getLocalDateParts(date: Date) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(date);
	const values = Object.fromEntries(
		parts.map(({ type, value }) => [type, value]),
	);
	return {
		year: Number(values.year),
		month: Number(values.month),
		day: Number(values.day),
		iso: `${values.year}-${values.month}-${values.day}`,
	};
}

function parseRequestedDate(value: string | Date | null | undefined) {
	if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
	if (typeof value !== "string" || !value.trim()) return new Date();
	const text = value.trim();
	const ddmmyyyy = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
	if (ddmmyyyy) {
		const [, day, month, year] = ddmmyyyy;
		return new Date(
			Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0),
		);
	}
	const parsed = new Date(text);
	return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function addDaysToLocalDate(
	parts: { year: number; month: number; day: number },
	days: number,
) {
	const date = new Date(
		Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0, 0),
	);
	return getLocalDateParts(date);
}

function dayStartUtc(parts: { year: number; month: number; day: number }) {
	return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
}

function dayEndUtc(parts: { year: number; month: number; day: number }) {
	return new Date(
		Date.UTC(parts.year, parts.month - 1, parts.day, 23, 59, 59, 999),
	);
}

function formatDate(value: Date | string | null | undefined) {
	if (!value) return "";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return getLocalDateParts(date).iso;
}

function formatDateTime(value: Date | string | null | undefined) {
	if (!value) return "";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return new Intl.DateTimeFormat("sv-SE", {
		timeZone: TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

function hasExplicitContextReference(value: string) {
	return EXPLICIT_CONTEXT_REFERENCE_PATTERN.test(value);
}

function relativeDateLabel(
	record: RecentRecord,
	anchorIso: string,
	yesterdayIso: string,
) {
	const recordIso = formatDate(record.Date);
	if (recordIso === anchorIso) return "today";
	if (recordIso === yesterdayIso) return "yesterday";
	return "recent";
}

function isRenderableField(field: MapField) {
	return field.Type !== "noRender";
}

function fieldLabel(dbKey: string, field: MapField) {
	return field.DisplayName?.trim() || dbKey;
}

function formatSchemaDigest(config: ConfigMap) {
	let schemaOptionCount = 0;
	const lines: string[] = [
		"Site diary schema context:",
		"- Use these fields and options for vocabulary/category mapping. Do not invent options outside the structured schema.",
	];

	for (const [dbKey, field] of Object.entries(config)) {
		if (!isRenderableField(field)) continue;
		const label = fieldLabel(dbKey, field);
		const displayKey = safeDisplayKey(label || dbKey);
		const description = getAiFieldDescription(field, dbKey, displayKey);
		const options = field.DropDownOptions
			? Object.values(field.DropDownOptions)
			: [];
		schemaOptionCount += options.length;

		const parts = [`- ${dbKey} (${label}, ${field.Type})`];
		if (description) parts.push(`guidance: ${compact(description, 300)}`);
		if (options.length) {
			parts.push(
				`options: ${options
					.slice(0, MAX_DROPDOWN_OPTIONS_PER_FIELD)
					.map((option) => compact(option, 120))
					.join(
						" | ",
					)}${options.length > MAX_DROPDOWN_OPTIONS_PER_FIELD ? " | ..." : ""}`,
			);
		}
		lines.push(parts.join("; "));
	}

	lines.push(
		"Numeric extraction rules:",
		"- WorkersInvolved, TimeInvolved, Amounts, and Units must come from the current message unless the current message explicitly supplies or references that numeric value.",
		"- Never copy workers, hours, amounts, units, locations, or dates from reference items for a standalone daily report.",
	);

	return { text: lines.join("\n"), schemaOptionCount };
}

type RecentRecord = {
	Date: Date | string | null;
	createdAt: Date | string;
	Location: string | null;
	Works: string | null;
	Comments: string | null;
	Units: string | null;
	Amounts: number | null;
	WorkersInvolved: number | null;
	TimeInvolved: number | null;
	originalUserComment: string | null;
};

function formatNumber(value: number | null | undefined) {
	return typeof value === "number" && Number.isFinite(value)
		? String(value)
		: "null";
}

function formatRecentRecord(
	record: RecentRecord,
	index: number,
	args: { anchorIso: string; yesterdayIso: string },
) {
	return [
		`Reference item ${index + 1}:`,
		`ValidForExplicitReferencesUntil: ${args.anchorIso}`,
		`RelativeDate: ${relativeDateLabel(record, args.anchorIso, args.yesterdayIso)}`,
		`Date: ${formatDate(record.Date) || "unknown"}`,
		`CreatedAt: ${formatDateTime(record.createdAt) || "unknown"}`,
		`Location: ${compact(record.Location) || "null"}`,
		`Works: ${compact(record.Works) || "null"}`,
		`Comments: ${compact(record.Comments) || "null"}`,
		`Amounts: ${formatNumber(record.Amounts)}`,
		`Units: ${compact(record.Units) || "null"}`,
		`WorkersInvolved: ${formatNumber(record.WorkersInvolved)}`,
		`TimeInvolved: ${formatNumber(record.TimeInvolved)}`,
		`SourcePreview: ${compact(record.originalUserComment, 260) || "null"}`,
	].join("; ");
}

function truncateContext(text: string) {
	if (text.length <= MAX_CONTEXT_CHARS) return { text, truncated: false };
	return {
		text: `${text.slice(0, MAX_CONTEXT_CHARS - 80).trimEnd()}\n[context truncated to bounded extraction budget]`,
		truncated: true,
	};
}

export async function buildSiteDiaryExtractionContext({
	siteId,
	userId,
	requestedDate,
	sourceText,
	config,
}: SiteDiaryExtractionContextArgs): Promise<SiteDiaryExtractionContext> {
	const anchor = getLocalDateParts(parseRequestedDate(requestedDate));
	const start = addDaysToLocalDate(anchor, -1);
	const end = anchor;
	const explicitContextReference = hasExplicitContextReference(sourceText);
	const recentRecords = await prisma.sitediaryrecords.findMany({
		where: {
			siteId,
			userId,
			archivedAt: null,
			Date: {
				gte: dayStartUtc(start),
				lte: dayEndUtc(end),
			},
		},
		orderBy: [{ createdAt: "desc" as const }],
		take: MAX_RECENT_RECORDS,
		select: {
			Date: true,
			createdAt: true,
			Location: true,
			Works: true,
			Comments: true,
			Units: true,
			Amounts: true,
			WorkersInvolved: true,
			TimeInvolved: true,
			originalUserComment: true,
		},
	});
	const schemaDigest = formatSchemaDigest(config);
	const rawText = [
		"Trusted extraction context:",
		`Current message preview: ${compact(sourceText, 500) || "(empty)"}`,
		`CurrentMessageHasExplicitContextReference: ${explicitContextReference}`,
		schemaDigest.text,
		"Recent trusted reference items for this site/user:",
		recentRecords.length
			? recentRecords
					.map((record, index) =>
						formatRecentRecord(record, index, {
							anchorIso: anchor.iso,
							yesterdayIso: start.iso,
						}),
					)
					.join("\n")
			: "- none found for today or yesterday",
		"Context use policy:",
		"- Use reference items only when CurrentMessageHasExplicitContextReference=true and the current message says same work, same place, yesterday, previous report, correction, continue, or similar.",
		"- For explicit same-work or same-place follow-ups, Works and Location may come from the most recent eligible reference item.",
		"- Numeric values from reference items must not be copied unless the current message explicitly references them; new values like 'vēl 3h' come from the current message.",
		"- If CurrentMessageHasExplicitContextReference=false, ignore reference items for field values.",
	].join("\n");
	const bounded = truncateContext(rawText);

	return {
		text: bounded.text,
		metadata: {
			recentRecordCount: recentRecords.length,
			hasExplicitContextReference: explicitContextReference,
			schemaOptionCount: schemaDigest.schemaOptionCount,
			truncated: bounded.truncated,
		},
	};
}
