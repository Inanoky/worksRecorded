export type DiaryMediaPhoto = {
	URL?: string | null;
	fileUrl?: string | null;
	Date: Date | string | null;
	Comment: string | null;
	Location: string | null;
};

function dayKey(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getClientDiaryMediaDays(
	photos: DiaryMediaPhoto[],
	recordDates: (Date | string)[],
	filters: {
		dateFrom?: Date | null;
		dateTo?: Date | null;
		work: string;
		location: string;
		keyword: string;
	},
) {
	if (filters.work !== "__ALL__") return [];
	const records = new Set(recordDates.map((date) => dayKey(new Date(date))));
	const keyword = filters.keyword.trim().toLowerCase();
	const days = new Map<
		string,
		{
			key: string;
			date: Date;
			latestPhotoDate: Date;
			photoCount: number;
			searchableText: string;
			hasDiaryRecords: boolean;
		}
	>();
	for (const photo of photos) {
		if (!photo.Date) continue;
		const date = new Date(photo.Date);
		if (Number.isNaN(date.getTime())) continue;
		const key = dayKey(date);
		const text = [photo.Comment, photo.Location].filter(Boolean).join(" ");
		if (filters.dateFrom && key < dayKey(filters.dateFrom)) continue;
		if (filters.dateTo && key > dayKey(filters.dateTo)) continue;
		if (filters.location !== "__ALL__" && photo.Location !== filters.location)
			continue;
		if (keyword && !text.toLowerCase().includes(keyword)) continue;
		const existing = days.get(key);
		if (existing) {
			existing.photoCount += 1;
			existing.searchableText += ` ${text}`;
			if (date > existing.latestPhotoDate) existing.latestPhotoDate = date;
		} else
			days.set(key, {
				key,
				date,
				latestPhotoDate: date,
				photoCount: 1,
				searchableText: text,
				hasDiaryRecords: records.has(key),
			});
	}
	return [...days.values()].sort(
		(a, b) => b.latestPhotoDate.getTime() - a.latestPhotoDate.getTime(),
	);
}
