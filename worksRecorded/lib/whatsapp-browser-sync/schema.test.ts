import { browserWhatsappAttachmentSchema } from "./schema";

describe("WhatsApp browser attachment validation", () => {
	it("accepts UploadThing CDN URLs", () => {
		expect(
			browserWhatsappAttachmentSchema.safeParse({
				url: "https://files.ufs.sh/f/example",
				mimeType: "image/jpeg",
			}),
		).toMatchObject({ success: true });
	});

	it("rejects other attachment hosts", () => {
		expect(
			browserWhatsappAttachmentSchema.safeParse({
				url: "https://example.com/private-image.jpg",
				mimeType: "image/jpeg",
			}),
		).toMatchObject({ success: false });
	});
});
