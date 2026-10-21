import { z } from "zod";

export const PREVIEW_DOCUMENT_TYPE = "limeni-visual-preview-v1";
export const preparedPreviewSchema = z.object({
	version: z.literal(1),
	source: z.string().min(1),
	pages: z
		.array(
			z.object({
				page: z.number().int().positive(),
				width: z.number().positive(),
				height: z.number().positive(),
				scales: z.array(z.number().positive()),
				url: z.string().url(),
				tiles: z
					.object({
						version: z.literal(1),
						size: z.literal(1024),
						format: z.enum(["webp", "png"]).optional(),
						levels: z
							.array(
								z.object({
									width: z.number().int().positive().max(16384),
									height: z.number().int().positive().max(16384),
									urls: z.array(z.string().url()).min(1).max(256),
								}),
							)
							.min(1)
							.max(4),
					})
					.optional(),
			}),
		)
		.min(1)
		.max(10),
});
export type PreparedPreview = z.infer<typeof preparedPreviewSchema>;

export function readPreparedPreview(description: string | undefined) {
	try {
		const result = preparedPreviewSchema.safeParse(
			description ? JSON.parse(description) : null,
		);
		return result.success ? result.data : null;
	} catch {
		return null;
	}
}
