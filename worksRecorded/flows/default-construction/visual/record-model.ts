import { z } from "zod";
import { dateSchema } from "../planner/model";
import { visualPlanAreaSchema } from "./planning-model";

export const visualRecordInputSchema = z
	.object({
		id: z.string().uuid(),
		date: dateSchema,
		work: z.string().trim().min(1).max(500),
		quantity: z.number().finite().positive().max(1e9),
		unit: z.string().trim().min(1).max(40),
		comments: z.string().trim().max(5000),
		areas: z.array(visualPlanAreaSchema).min(1).max(50),
	})
	.strict();

export type VisualRecordInput = z.infer<typeof visualRecordInputSchema>;
