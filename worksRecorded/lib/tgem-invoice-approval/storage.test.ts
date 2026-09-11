import {
	getPersistableTgemInvoiceUrl,
	getTgemInvoiceDocumentPath,
	toTgemInvoiceStorageMetadata,
} from "@/lib/tgem-invoice-approval/storage";

describe("TGEM invoice storage", () => {
	it("requires the permanent UploadThing ufsUrl", () => {
		expect(() =>
			getPersistableTgemInvoiceUrl({ url: "https://files.ufs.sh/f/temporary" }),
		).toThrow("permanent UploadThing ufsUrl");
	});

	it("rejects temporary Meta media URLs", () => {
		expect(() =>
			getPersistableTgemInvoiceUrl({
				ufsUrl: "https://lookaside.fbsbx.com/temporary-invoice.jpg",
			}),
		).toThrow("Temporary Meta media URLs");
	});

	it("returns stable storage metadata and an authenticated document path", () => {
		expect(
			toTgemInvoiceStorageMetadata({
				ufsUrl: "https://files.ufs.sh/f/invoice-123",
			}),
		).toEqual({
			storageProvider: "uploadthing",
			canonicalUrl: "https://files.ufs.sh/f/invoice-123",
		});

		expect(getTgemInvoiceDocumentPath("case/1", "document 2")).toBe(
			"/api/tgem/invoices/case%2F1/documents/document%202",
		);
	});
});
