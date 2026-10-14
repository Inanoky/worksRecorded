import { z } from "zod";

const text = z.string().max(1500).nullable().optional();
const number = z.preprocess(
	(value) => (value === "" ? null : value),
	z.coerce.number().finite().min(-1e9).max(1e9).nullable().optional(),
);
export const diaryEditFields = z
	.object({
		Date: z.coerce.date().nullable().optional(),
		Date_Custom_1: z.coerce.date().nullable().optional(),
		Date_Custom_2: z.coerce.date().nullable().optional(),
		Location: text,
		Location_Custom_1: text,
		Location_Custom_2: text,
		Works: text,
		Works_Custom_1: text,
		Works_Custom_2: text,
		Comments: text,
		Comments_Custom_1: text,
		Comments_Custom_2: text,
		Units: z.string().max(100).nullable().optional(),
		Amounts: number,
		WorkersInvolved: number,
		TimeInvolved: number,
	})
	.strict();

export const diaryEditInputSchema = z
	.object({
		siteId: z.string().uuid(),
		updates: z
			.array(
				z.object({
					id: z.string().min(1).max(128),
					fields: diaryEditFields,
					expected: diaryEditFields.optional(),
				}),
			)
			.max(200),
		creates: z
			.array(z.object({ clientId: z.string().uuid(), fields: diaryEditFields }))
			.max(200),
	})
	.strict()
	.refine((input) => input.updates.length + input.creates.length <= 200);

export type DiaryEditRequest = z.input<typeof diaryEditInputSchema>;

export function sameDiaryValue(key: string, a: unknown, b: unknown) {
	if (["Date", "Date_Custom_1", "Date_Custom_2"].includes(key))
		return (
			(a ? new Date(a as string).getTime() : null) ===
			(b ? new Date(b as string).getTime() : null)
		);
	if (["Amounts", "WorkersInvolved", "TimeInvolved"].includes(key))
		return (
			(a === "" || a == null ? null : Number(a)) ===
			(b === "" || b == null ? null : Number(b))
		);
	return (a ?? "") === (b ?? "");
}
