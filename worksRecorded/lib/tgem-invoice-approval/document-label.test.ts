import { tgemDocumentDisplayName } from "./document-label";

it("shortens existing WhatsApp message IDs while preserving the file extension", () => {
	const filename = `whatsapp-invoice-wamid.${"A".repeat(100)}XYZ123.jpg`;
	const label = tgemDocumentDisplayName(filename);
	expect(label).toBe("WhatsApp AAAAAAAA…XYZ123.jpg");
	expect(filename).toContain("A".repeat(100));
});

it("keeps normal filenames and compact WhatsApp names readable", () => {
	expect(tgemDocumentDisplayName("supplier-invoice.pdf")).toBe(
		"supplier-invoice.pdf",
	);
	expect(tgemDocumentDisplayName("whatsapp-invoice-a1b2c3d4e5f6.jpg")).toBe(
		"WhatsApp a1b2c3d4e5f6.jpg",
	);
	expect(
		tgemDocumentDisplayName(`${"long-name".repeat(20)}.pdf`).length,
	).toBeLessThanOrEqual(64);
});
