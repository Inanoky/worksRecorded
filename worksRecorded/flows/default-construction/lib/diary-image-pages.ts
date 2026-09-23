import type { DiaryMediaPhoto } from "./diary-media-days";
import { normalizeDiaryPhotoUrls } from "./diary-photos";

export const DIARY_DAY_PAGE_SIZE = 10;

export function getDiaryImagePageRange(page: number, pageSize: number) {
	return page <= 2
		? { skip: 0, take: pageSize * 2 }
		: { skip: (page - 1) * pageSize, take: pageSize };
}

export function getDiaryPagePhotoUrls(
	groups: { key: string; rows: { Photos?: unknown }[] }[],
	mediaPhotos: DiaryMediaPhoto[],
	page: number,
) {
	const { skip, take } = getDiaryImagePageRange(page, DIARY_DAY_PAGE_SIZE);
	const selected = groups.slice(skip, skip + take);
	const days = new Set(selected.map((group) => group.key));
	const mediaUrls = mediaPhotos.flatMap((photo) => {
		if (!photo.Date) return [];
		const date = new Date(photo.Date);
		if (Number.isNaN(date.getTime())) return [];
		const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
		return days.has(key) ? [photo.URL || photo.fileUrl] : [];
	});
	return normalizeDiaryPhotoUrls([
		...selected.flatMap((group) =>
			group.rows.flatMap((row) => normalizeDiaryPhotoUrls(row.Photos)),
		),
		...mediaUrls,
	]).sort();
}
