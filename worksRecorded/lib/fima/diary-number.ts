export function formatFimaDiaryNumber(value: unknown) {
	return typeof value === "number" && Number.isSafeInteger(value) && value > 0
		? `FIMA-${String(value).padStart(6, "0")}`
		: "—";
}

export function parseFimaDiaryNumber(value?: string | null) {
	const match = value?.trim().match(/^(?:FIMA\s*-?\s*)?(\d+)$/i);
	if (!match) return null;
	const number = Number(match[1]);
	return Number.isSafeInteger(number) && number > 0 && number <= 2_147_483_647
		? number
		: null;
}

export function matchesFimaDiaryNumber(value: unknown, keyword: string) {
	const number = parseFimaDiaryNumber(keyword);
	return number !== null && value === number;
}
