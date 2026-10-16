export const fimaInlineFields = [
	"Date",
	"Works",
	"Works_Custom_1",
	"Location",
	"Works_Custom_2",
	"Amounts",
	"Units",
] as const;
export type FimaInlineField = (typeof fimaInlineFields)[number];
export const fimaFieldLabels: Record<FimaInlineField, string> = {
	Date: "Datums",
	Works: "Darba apraksts",
	Works_Custom_1: "BIS apraksts",
	Location: "Balsti",
	Works_Custom_2: "Maiņa",
	Amounts: "Apjoms",
	Units: "Mērvienība",
};
export function isFimaInlineField(field: string): field is FimaInlineField {
	return (fimaInlineFields as readonly string[]).includes(field);
}
export function fimaInlineValue(value: unknown) {
	return value instanceof Date
		? value.toISOString()
		: value == null
			? ""
			: String(value);
}
