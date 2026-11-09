import {
	getInvoicePrefixesForSupplierSearch,
	inferSupplierNameFromInvoiceNumber,
	resolveInvoiceSupplierName,
} from "./invoice-supplier-map";

describe("invoice supplier map", () => {
	it.each(["OLP", "olp-123", " OLP2026/44 ", "OLC-44", "OLS-45"])(
		"maps %s to OPTIMERA LATVIA, SIA",
		(invoiceNumber) => {
			expect(inferSupplierNameFromInvoiceNumber(invoiceNumber)).toBe(
				"OPTIMERA LATVIA, SIA",
			);
		},
	);

	it("uses a mapped supplier before an extracted value", () => {
		expect(resolveInvoiceSupplierName("OLP-1", "Wrong supplier")).toBe(
			"OPTIMERA LATVIA, SIA",
		);
	});

	it("returns mapped invoice prefixes for supplier searches", () => {
		expect(getInvoicePrefixesForSupplierSearch("Optimera")).toEqual([
			"OLP",
			"OLC",
			"OLS",
		]);
		expect(getInvoicePrefixesForSupplierSearch("OPTIMERA LATVIA, SIA")).toEqual(
			["OLP", "OLC", "OLS"],
		);
	});

	it("keeps the extracted supplier for unknown invoice numbers", () => {
		expect(resolveInvoiceSupplierName("INV-1", "  Supplier  ")).toBe(
			"Supplier",
		);
	});
});
