export type TgemEditableInvoiceField =
	| "invoiceNumber"
	| "invoiceDate"
	| "dueDate";

export type TgemInvoiceDetailsError =
	| "invalid_input"
	| "invalid_number"
	| "invalid_date"
	| "invalid_version"
	| "access_denied"
	| "processing"
	| "conflict";

export function normalizeTgemInvoiceDetailValue(
	field: TgemEditableInvoiceField,
	value: string,
):
	| { ok: true; value: string | null }
	| { ok: false; error: TgemInvoiceDetailsError } {
	const normalized = value.trim();
	if (!normalized) return { ok: true, value: null };
	if (field === "invoiceNumber") {
		if (
			normalized.length > 120 ||
			Array.from(normalized).some(
				(character) =>
					character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
			)
		) {
			return { ok: false, error: "invalid_number" };
		}
		return { ok: true, value: normalized };
	}
	if (
		!/^\d{4}-\d{2}-\d{2}$/.test(normalized) ||
		normalized.startsWith("0000-")
	) {
		return { ok: false, error: "invalid_date" };
	}
	const date = new Date(`${normalized}T00:00:00.000Z`);
	if (
		Number.isNaN(date.getTime()) ||
		date.toISOString().slice(0, 10) !== normalized
	) {
		return { ok: false, error: "invalid_date" };
	}
	return { ok: true, value: normalized };
}
