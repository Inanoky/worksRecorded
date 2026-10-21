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
