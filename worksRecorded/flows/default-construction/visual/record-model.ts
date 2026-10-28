import { z } from "zod";
import { dateSchema } from "../planner/model";
import { VISUAL_PLAN_MAX_AREAS, visualPlanAreaSchema } from "./planning-model";

export const visualRecordInputSchema = z
	.object({
		id: z.string().uuid(),
		date: dateSchema,
		work: z.string().trim().min(1).max(500),
		quantity: z.number().finite().positive().max(1e9),
		unit: z.string().trim().min(1).max(40),
		comments: z.string().trim().max(5000),
		areas: z.array(visualPlanAreaSchema).min(1).max(VISUAL_PLAN_MAX_AREAS),
	})
	.strict();

export type VisualRecordInput = z.infer<typeof visualRecordInputSchema>;

export const visualRecordAttachmentSchema = z
	.object({
		id: z.string().uuid(),
		recordId: z.string().min(1).max(200),
		areas: z.array(visualPlanAreaSchema).min(1).max(VISUAL_PLAN_MAX_AREAS),
	})
	.strict();
export type VisualRecordChoice = {
	id: string;
	date: string | null;
	work: string;
	location: string;
	amount: string;
	unit: string;
	hasDrawing: boolean;
	originalMessage: string;
};
