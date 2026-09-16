import {
	debugSiteDiaryFastPathCandidate,
	hasExplicitSiteDiaryCorrectionIntent,
	looksLikeStandaloneSiteDiaryReport,
} from "./fastPath";

export function canSaveDiaryFallbackNote(args: {
	source: string;
	persist?: boolean;
	hasReplyContext?: boolean;
	hasPendingCorrection?: boolean;
	confirmedReport: boolean;
}) {
	if (args.persist === false || !args.source.trim()) return false;
	if (args.hasReplyContext || args.hasPendingCorrection) return false;
	if (hasExplicitSiteDiaryCorrectionIntent(args.source)) return false;
	if (
		/^\s*(?:salabo|izlabo|labo|maini|nomaini|izmaini|correct|fix|change|replace|исправь|измени)(?:\s|$|[.!?])/iu.test(
			args.source,
		)
	)
		return false;
	const candidate = debugSiteDiaryFastPathCandidate(args.source);
	if (
		candidate.question ||
		candidate.greeting ||
		candidate.projectCommand ||
		candidate.followUp ||
		candidate.ambiguousReference ||
		candidate.metaRequest ||
		candidate.bis
	)
		return false;
	return (
		args.confirmedReport || looksLikeStandaloneSiteDiaryReport(args.source)
	);
}

export function buildDiaryFallbackNote(source: string, date: string) {
	const parts = /^(\d{2})-(\d{2})-(\d{4})$/.exec(date);
	const iso = parts ? `${parts[3]}-${parts[2]}-${parts[1]}` : date;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
	const parsed = new Date(`${iso}T00:00:00.000Z`);
	if (
		!Number.isFinite(parsed.getTime()) ||
		parsed.toISOString().slice(0, 10) !== iso
	)
		return null;
	return {
		Date: parsed.toISOString(),
		Works: "Piezīmes",
		Comments: source,
		Location: null,
		Amounts: null,
		Units: null,
		WorkersInvolved: null,
		TimeInvolved: null,
	};
}
