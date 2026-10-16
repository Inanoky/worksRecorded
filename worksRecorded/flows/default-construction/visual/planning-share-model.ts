import { z } from "zod";

export const VISUAL_SHARE_TYPE = "limeni-visual-work-share-v1";
export const SHARE_MAX_BODY = 3_500_000;
export const SHARE_MAX_IMAGE = 300_000;
export const shareTokenSchema = z
	.string()
	.regex(/^[0-9a-f-]{36}\.[0-9a-f]{64}$/);
export const planningShareSchema = z.object({
	version: z.literal(1),
	tokenHash: z.string().regex(/^[0-9a-f]{64}$/),
	planId: z.string().uuid(),
	planVersion: z.number().int().positive(),
	drawingId: z.string().uuid(),
	work: z.string().max(200),
	location: z.string().max(200),
	section: z.string().max(120).nullable(),
	quantity: z.number().finite().positive(),
	unit: z.string().max(40),
	startDate: z.string(),
	endDate: z.string(),
	images: z
		.array(
			z.object({
				page: z.number().int().min(1).max(10),
				url: z.string().url(),
				key: z.string().min(1),
			}),
		)
		.min(1)
		.max(10),
});
export const publicWorkPath = (token: string) => `/shared/work/${token}`;
export function isShareImageUrl(value: string) {
	try {
		const url = new URL(value);
		return (
			url.protocol === "https:" &&
			!url.username &&
			!url.password &&
			!url.port &&
			(url.hostname === "utfs.io" || url.hostname.endsWith(".ufs.sh"))
		);
	} catch {
		return false;
	}
}
