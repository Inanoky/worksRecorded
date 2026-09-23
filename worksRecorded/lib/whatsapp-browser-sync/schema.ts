import { z } from "zod";

export const browserWhatsappAttachmentSchema = z.object({
	url: z
		.string()
		.url()
		.refine((value) => value.startsWith("https://"), {
			message: "Attachment URLs must use HTTPS",
		})
		.refine(
			(value) => {
				try {
					const hostname = new URL(value).hostname.toLowerCase();
					return ["ufs.sh", "utfs.io", "uploadthing.com"].some(
						(domain) => hostname === domain || hostname.endsWith(`.${domain}`),
					);
				} catch {
					return false;
				}
			},
			{
				message: "Attachment URLs must use the configured UploadThing CDN",
			},
		),
	mimeType: z.string().min(1).max(120),
	fileName: z.string().max(255).nullable().optional(),
	sha256: z
		.string()
		.regex(/^[a-f0-9]{64}$/i)
		.nullable()
		.optional(),
});

export const browserWhatsappSourceMessageSchema = z.object({
	sourceId: z.string().min(1).max(500),
	senderName: z.string().trim().min(1).max(200),
	senderPhone: z.string().trim().max(40).nullable().optional(),
	sentAt: z.string().datetime({ offset: true }),
	text: z.string().max(20_000).default(""),
	attachmentIndexes: z
		.array(z.number().int().min(0).max(50))
		.max(20)
		.default([]),
});

export const browserWhatsappIngestSchema = z.object({
	idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/i),
	organizationId: z.string().uuid(),
	groupName: z.string().trim().min(1).max(250),
	sourceMessages: z.array(browserWhatsappSourceMessageSchema).min(1).max(30),
	attachments: z.array(browserWhatsappAttachmentSchema).max(20).default([]),
});

export type BrowserWhatsappAttachment = z.infer<
	typeof browserWhatsappAttachmentSchema
>;
export type BrowserWhatsappSourceMessage = z.infer<
	typeof browserWhatsappSourceMessageSchema
>;
export type BrowserWhatsappIngest = z.infer<typeof browserWhatsappIngestSchema>;

export const browserDiaryEntrySchema = z.object({
	projectName: z.string().trim().min(1).max(250),
	workCategory: z.enum([
		"estrich",
		"film",
		"thermowhite",
		"material_delivery",
		"other",
	]),
	workText: z.string().trim().min(1).max(500),
	workDate: z.string().date().nullable(),
	location: z.string().trim().max(250).nullable(),
	plannedAreaM2: z.number().min(0).max(1_000_000_000).nullable(),
	bagCount: z.number().min(0).max(1_000_000).nullable(),
	thicknessMinMm: z.number().min(0).max(10_000).nullable(),
	thicknessMaxMm: z.number().min(0).max(10_000).nullable(),
	workerCount: z.number().int().min(0).max(10_000).nullable(),
	hours: z.number().min(0).max(100_000).nullable(),
	notes: z.string().trim().max(2_000).nullable(),
	attachmentIndexes: z.array(z.number().int().min(0).max(50)).max(20),
});

export const browserDiaryExtractionSchema = z.object({
	entries: z.array(browserDiaryEntrySchema).max(30),
	ambiguity: z.string().trim().max(2_000).nullable(),
});

export type BrowserDiaryEntry = z.infer<typeof browserDiaryEntrySchema>;
export type BrowserDiaryExtraction = z.infer<
	typeof browserDiaryExtractionSchema
>;
