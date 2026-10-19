export const fimaDiaryColumns = [
	{ field: "Date", label: "Datums", order: 1, width: 120 },
	{ field: "FimaBisCase", label: "BIS ieraksta Nr.", order: 1.5, width: 100 },
	{ field: "Works", label: "Darba apraksts", order: 2, width: 200 },
	{ field: "Location", label: "Balsti / posms", order: 3, width: 150 },
	{ field: "Works_Custom_1", label: "BIS apraksts", order: 4, width: 220 },
	{ field: "Works_Custom_2", label: "Maiņa", order: 5, width: 110 },
	{ field: "FimaMaterials", label: "Materiāli", order: 7.5, width: 500 },
	{ field: "FimaExamples", label: "Paraugas", order: 9, width: 260 },
	{ field: "FimaComments", label: "Komentāri", order: 9.5, width: 145 },
	{ field: "Amounts", label: "Daudzums", order: 11, width: 90 },
	{ field: "Units", label: "Mērv.", order: 12, width: 70 },
	{ field: "FimaReviewStatus", label: "Rīcība", order: 1000, width: 220 },
] as const;

export const fimaDiaryColumnWeights: Record<string, number> = {
	...Object.fromEntries(
		fimaDiaryColumns.map(({ field, width }) => [field, width]),
	),
	select: 52,
	project: 160,
	bis: 140,
	action: 80,
	source: 60,
};

export const fimaDiaryTableClassName =
	"w-full min-w-0 table-fixed rounded-lg border border-slate-200/80 text-xs [&_th]:!w-auto [&_td]:!w-auto [&_th]:!px-1.5 [&_td]:!px-1.5 [&_th]:!whitespace-normal [&_td]:!whitespace-normal [&_th]:[overflow-wrap:anywhere] [&_td]:[overflow-wrap:anywhere] [&_button]:max-w-full [&_thead]:bg-slate-50/80 [&_th]:!py-3 [&_th]:font-semibold [&_td]:!py-3 [&_td]:align-top [&_td]:leading-relaxed [&_tbody_tr:nth-child(even)]:bg-muted/20 dark:border-slate-700 dark:[&_thead]:bg-slate-900";

export function groupFimaDiaryRows<T extends { Date: Date | string | null }>(
	rows: T[],
) {
	const groups = new Map<string, { key: string; label: string; rows: T[] }>();
	const keyFormat = new Intl.DateTimeFormat("en-CA", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		timeZone: "Europe/Riga",
	});
	const labelFormat = new Intl.DateTimeFormat("lv-LV", {
		weekday: "short",
		year: "numeric",
		month: "long",
		day: "numeric",
		timeZone: "Europe/Riga",
	});
	for (const row of rows) {
		const date = row.Date == null ? null : new Date(row.Date);
		const valid = date && Number.isFinite(date.getTime());
		const key = valid ? keyFormat.format(date) : "undated";
		let group = groups.get(key);
		if (!group) {
			group = {
				key,
				label: valid ? labelFormat.format(date) : "Bez datuma",
				rows: [],
			};
			groups.set(key, group);
		}
		group.rows.push(row);
	}
	return [...groups.values()].sort((a, b) =>
		a.key === "undated"
			? 1
			: b.key === "undated"
				? -1
				: b.key.localeCompare(a.key),
	);
}
