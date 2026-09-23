import { normalizeDiaryPhotoUrls } from "./diary-photos";

type Scope = {
	id: string;
	organizationId: string | null;
	siteId: string | null;
	userId: string | null;
	Date: Date | string | null;
};
export type RecoveryPhoto = Scope & {
	URL: string | null;
	fileUrl: string | null;
	Comment: string | null;
	mediaPurpose: string | null;
};
export type RecoveryRecord = Scope & {
	originalUserComment: string | null;
	Photos: string[] | null;
	saveBatchId: string | null;
};
const normalize = (text: string | null) =>
	(text ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
const day = (value: Date | string | null) =>
	value
		? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Riga" }).format(
				new Date(value),
			)
		: null;

export function recoverDiaryPhotoLinks(
	photos: RecoveryPhoto[],
	records: RecoveryRecord[],
) {
	const links: {
		photoId: string;
		recordId: string;
		url: string;
		evidence: string;
	}[] = [];
	const unresolved: { photoId: string; reason: string }[] = [];
	for (const photo of photos) {
		if (photo.mediaPurpose && photo.mediaPurpose !== "site_diary") continue;
		const [url] = normalizeDiaryPhotoUrls([photo.URL || photo.fileUrl]);
		if (!url || !photo.organizationId || !photo.siteId) continue;
		const scoped = records.filter(
			(record) =>
				record.organizationId === photo.organizationId &&
				record.siteId === photo.siteId,
		);
		if (scoped.some((record) => record.Photos?.includes(url))) continue;
		const file = photo.Comment?.match(
			/\d+-PHOTO-[\d-]+\.(?:jpg|jpeg|png|webp)/i,
		)?.[0];
		const explicit = file
			? scoped.filter((record) => record.originalUserComment?.includes(file))
			: [];
		const caption = normalize(photo.Comment);
		const exact =
			caption.length >= 30 && photo.userId && photo.Date
				? scoped.filter(
						(record) =>
							record.userId === photo.userId &&
							day(record.Date) === day(photo.Date) &&
							normalize(record.originalUserComment) === caption,
					)
				: [];
		const candidates = explicit.length ? explicit : exact;
		const reportKeys = new Set(
			candidates.map(
				(record) =>
					record.saveBatchId ||
					`${day(record.Date)}:${normalize(record.originalUserComment)}`,
			),
		);
		if (
			!candidates.length ||
			reportKeys.size !== 1 ||
			(!explicit.length &&
				candidates.length > 1 &&
				!candidates.every(
					(record) =>
						record.saveBatchId &&
						record.saveBatchId === candidates[0].saveBatchId,
				))
		) {
			unresolved.push({
				photoId: photo.id,
				reason: candidates.length
					? "ambiguous-report"
					: "no-explicit-source-match",
			});
			continue;
		}
		for (const record of candidates)
			links.push({
				photoId: photo.id,
				recordId: record.id,
				url,
				evidence: explicit.length
					? `source-filename:${file}`
					: "exact-caption-sender-site-day",
			});
	}
	return { links, unresolved };
}
