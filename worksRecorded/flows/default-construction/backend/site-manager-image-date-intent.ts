const RIGA_TIME_ZONE = "Europe/Riga";
const IMAGE_DATE_WORKFLOW_ID =
	"whatsapp-site-manager:image-date-classification";
const IMAGE_DATE_WORKFLOW_NAME =
	"WhatsApp site-manager image date classification";

export type RegularImageDateIntent = {
	targetDate: Date | null;
	targetDateISO: string | null;
	dateReason: string;
	confidence: number;
	shouldProcessCaptionAsDiaryText: boolean;
};

function stripDiacritics(value: string) {
	return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeCaption(value: string) {
	return stripDiacritics(value)
		.toLocaleLowerCase("lv-LV")
		.replace(/\s+/g, " ")
		.trim();
}

function getTimeZoneParts(date: Date, timeZone = RIGA_TIME_ZONE) {
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	}).formatToParts(date);
	const values = Object.fromEntries(
		parts.map(({ type, value }) => [type, value]),
	);
	return {
		year: Number(values.year),
		month: Number(values.month),
		day: Number(values.day),
		hour: Number(values.hour),
		minute: Number(values.minute),
		second: Number(values.second),
	};
}

function getRigaLocalDateParts(date: Date) {
	const parts = getTimeZoneParts(date);
	return {
		year: parts.year,
		month: parts.month,
		day: parts.day,
	};
}

function localDateToISO(parts: { year: number; month: number; day: number }) {
	return [
		String(parts.year).padStart(4, "0"),
		String(parts.month).padStart(2, "0"),
		String(parts.day).padStart(2, "0"),
	].join("-");
}

function rigaLocalNoonToUtc(parts: {
	year: number;
	month: number;
	day: number;
}) {
	const utcGuess = Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		12,
		0,
		0,
		0,
	);
	const rendered = getTimeZoneParts(new Date(utcGuess));
	const renderedAsUtc = Date.UTC(
		rendered.year,
		rendered.month - 1,
		rendered.day,
		rendered.hour,
		rendered.minute,
		rendered.second,
		0,
	);
	return new Date(utcGuess - (renderedAsUtc - utcGuess));
}

function addDays(
	parts: { year: number; month: number; day: number },
	days: number,
) {
	const date = new Date(
		Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0, 0),
	);
	return {
		year: date.getUTCFullYear(),
		month: date.getUTCMonth() + 1,
		day: date.getUTCDate(),
	};
}

function isValidLocalDate(parts: { year: number; month: number; day: number }) {
	if (parts.year < 2000 || parts.year > 2100) return false;
	if (parts.month < 1 || parts.month > 12) return false;
	if (parts.day < 1 || parts.day > 31) return false;
	const check = new Date(
		Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0),
	);
	return (
		check.getUTCFullYear() === parts.year &&
		check.getUTCMonth() + 1 === parts.month &&
		check.getUTCDate() === parts.day
	);
}

function parseExplicitDate(
	caption: string,
	anchor: { year: number; month: number; day: number },
) {
	const iso = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/.exec(caption);
	if (iso) {
		const parts = {
			year: Number(iso[1]),
			month: Number(iso[2]),
			day: Number(iso[3]),
		};
		return isValidLocalDate(parts) ? parts : null;
	}

	const local = /\b(\d{1,2})[.\-/](\d{1,2})(?:[.\-/](20\d{2}))?\b/.exec(
		caption,
	);
	if (local) {
		const parts = {
			year: local[3] ? Number(local[3]) : anchor.year,
			month: Number(local[2]),
			day: Number(local[1]),
		};
		return isValidLocalDate(parts) ? parts : null;
	}

	return null;
}

function resolveCaptionDate(caption: string, now: Date) {
	const normalized = normalizeCaption(caption);
	const anchor = getRigaLocalDateParts(now);
	const explicit = parseExplicitDate(normalized, anchor);
	if (explicit) {
		return {
			parts: explicit,
			reason: "explicit_date",
			confidence: 0.95,
		};
	}

	if (/\b(aizvakar|day before yesterday)\b/u.test(normalized)) {
		return {
			parts: addDays(anchor, -2),
			reason: "relative_day_before_yesterday",
			confidence: 0.9,
		};
	}

	if (/\b(vakar|vakardien\w*|yesterday)\b/u.test(normalized)) {
		return {
			parts: addDays(anchor, -1),
			reason: "relative_yesterday",
			confidence: 0.9,
		};
	}

	if (
		/\b(pagajus\w* nedel\w*|pagajusonedel\w*|last week)\b/u.test(normalized)
	) {
		return {
			parts: addDays(anchor, -7),
			reason: "relative_last_week",
			confidence: 0.75,
		};
	}

	if (/\b(sodien|today)\b/u.test(normalized)) {
		return {
			parts: anchor,
			reason: "relative_today",
			confidence: 0.85,
		};
	}

	return null;
}

function captionHasWorkReportSignals(normalized: string) {
	return /\b(pabeidz\w*|izdar\w*|veic\w*|veicam|monta\w*|montaz\w*|beton\w*|sien\w*|grid\w*|apmet\w*|rak\w*|demont\w*|uzstad\w*|iestrad\w*|ieklaj\w*|darbi?|work|worked|finished|completed|installed|poured|plaster\w*|excavat\w*|\d+(?:[,.]\d+)?\s*(?:h|m2|m3|gab)|cilvek\w*|stradniek\w*|worker\w*)\b/u.test(
		normalized,
	);
}

function captionIsPhotoPlacementOnly(normalized: string) {
	if (!normalized) return false;
	if (captionHasWorkReportSignals(normalized)) return false;
	return /\b(foto\w*|bild\w*|attel\w*|image|photo|picture|pievien\w*|pieliec\w*|ieliec\w*|saglab\w*|add|save|put)\b/u.test(
		normalized,
	);
}

export function classifyRegularSiteDiaryImageCaption(args: {
	caption: string;
	now?: Date;
}): RegularImageDateIntent {
	const caption = args.caption.trim();
	const normalized = normalizeCaption(caption);
	const resolved = resolveCaptionDate(caption, args.now ?? new Date());
	const placementOnly = captionIsPhotoPlacementOnly(normalized);
	const shouldProcessCaptionAsDiaryText = Boolean(caption) && !placementOnly;
	const targetDate = resolved ? rigaLocalNoonToUtc(resolved.parts) : null;
	const targetDateISO = resolved ? localDateToISO(resolved.parts) : null;
	const intent = {
		targetDate,
		targetDateISO,
		dateReason: resolved?.reason ?? "no_date_intent",
		confidence: resolved?.confidence ?? 0,
		shouldProcessCaptionAsDiaryText,
	};
	console.log("Site manager image date classification", {
		workflowId: IMAGE_DATE_WORKFLOW_ID,
		workflowName: IMAGE_DATE_WORKFLOW_NAME,
		messageType: "image",
		mediaPurpose: "site_diary_caption",
		tags: [
			`workflow:${IMAGE_DATE_WORKFLOW_ID}`,
			"message-type:image",
			"media-purpose:site_diary_caption",
		],
		targetDateISO,
		confidence: intent.confidence,
		dateReason: intent.dateReason,
		shouldProcessCaptionAsDiaryText,
		captionPreview: caption.slice(0, 180),
	});

	return intent;
}
