export function formatLimeniDiaryHours(value: unknown, locale: string): string {
	if (value == null || value === "") return "—";
	const hours =
		typeof value === "number"
			? value
			: typeof value === "string"
				? Number(value.trim().replace(",", "."))
				: NaN;
	if (!Number.isFinite(hours) || hours === 0) return "—";
	return hours.toLocaleString(locale, { maximumFractionDigits: 2 });
}
