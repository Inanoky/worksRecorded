export const INVOICE_SUPPLIER_PREFIX_MAP = [
	{ prefix: "OLP", supplierName: "OPTIMERA LATVIA, SIA" },
	{ prefix: "OLC", supplierName: "OPTIMERA LATVIA, SIA" },
	{ prefix: "OLS", supplierName: "OPTIMERA LATVIA, SIA" },
] as const;

export function inferSupplierNameFromInvoiceNumber(
	invoiceNumber: string | null | undefined,
) {
	const normalized = invoiceNumber?.trim().toLocaleUpperCase();
	if (!normalized) return null;
	return (
		INVOICE_SUPPLIER_PREFIX_MAP.find(({ prefix }) =>
			normalized.startsWith(prefix),
		)?.supplierName ?? null
	);
}

export function getInvoicePrefixesForSupplierSearch(search: string) {
	const normalized = search.trim().toLocaleLowerCase();
	if (normalized.length < 3) return [];
	return Array.from(
		new Set(
			INVOICE_SUPPLIER_PREFIX_MAP.filter(({ supplierName }) =>
				supplierName.toLocaleLowerCase().includes(normalized),
			).map(({ prefix }) => prefix),
		),
	);
}

export function resolveInvoiceSupplierName(
	invoiceNumber: string | null | undefined,
	extractedSupplierName: string | null | undefined,
) {
	return (
		(inferSupplierNameFromInvoiceNumber(invoiceNumber) ??
			extractedSupplierName?.trim()) ||
		null
	);
}
