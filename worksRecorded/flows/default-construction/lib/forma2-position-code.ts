export function normalizeForma2PositionCode(value: unknown): string {
	return String(value ?? "")
		.trim()
		.replace(/^\d+(?:[.,]\d+)+\.?(?=$|[\s:])/u, (code) =>
			code.replace(/,/g, "."),
		);
}
