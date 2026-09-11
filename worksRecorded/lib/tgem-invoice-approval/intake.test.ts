import {
	buildTgemInvoiceIdempotencyKey,
	normalizeTgemInvoiceIntake,
} from "@/lib/tgem-invoice-approval/intake";

describe("TGEM invoice intake", () => {
	const baseInput = {
		organizationId: "org-1",
		siteId: "site-1",
		source: "whatsapp" as const,
		sourceMessageId: "wamid-1",
		sourceSender: "+37120000000",
		storageFile: { ufsUrl: "https://files.ufs.sh/f/invoice-1" },
		storageKey: "invoice-1",
		originalFilename: "  invoice.pdf ",
		contentType: "application/pdf",
		byteSize: 1200,
		sha256: "hash-1",
	};

	it("normalizes all intake sources into one persisted shape", () => {
		expect(normalizeTgemInvoiceIntake(baseInput)).toEqual({
			organizationId: "org-1",
			siteId: "site-1",
			submittedByUserId: null,
			idempotencyKey: "tgem-invoice:org-1:whatsapp:wamid-1",
			source: "whatsapp",
			sourceMessageId: "wamid-1",
			sourceSender: "+37120000000",
			status: "received",
			ocrStatus: "pending",
			extractionStatus: "pending",
			document: {
				storageProvider: "uploadthing",
				canonicalUrl: "https://files.ufs.sh/f/invoice-1",
				storageKey: "invoice-1",
				originalFilename: "invoice.pdf",
				contentType: "application/pdf",
				byteSize: 1200,
				sha256: "hash-1",
				source: "whatsapp",
			},
		});
	});

	it("uses a stable fallback identifier for dashboard uploads", () => {
		expect(
			buildTgemInvoiceIdempotencyKey({
				organizationId: "org-1",
				source: "dashboard",
				storageKey: "upload-key-1",
			}),
		).toBe("tgem-invoice:org-1:dashboard:upload-key-1");
	});

	it("rejects unsupported documents and missing idempotency identifiers", () => {
		expect(() =>
			normalizeTgemInvoiceIntake({ ...baseInput, contentType: "text/plain" }),
		).toThrow("Unsupported TGEM invoice content type");
		expect(() =>
			buildTgemInvoiceIdempotencyKey({
				organizationId: "org-1",
				source: "email",
			}),
		).toThrow("source message ID or storage identifier");
	});
});
