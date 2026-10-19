export function formatFimaDiaryNumber(value: unknown) {
	return typeof value === "number" && Number.isSafeInteger(value) && value > 0
		? `FIMA-${String(value).padStart(6, "0")}`
		: "—";
}
