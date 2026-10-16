import { z } from "zod";
import {
	dateSchema,
	planMatchKey,
} from "@/flows/default-construction/planner/model";
import { isSimplePolygon, polygonArea } from "./model";
import { visualSectionSchema } from "./sections";

export const VISUAL_PLAN_TYPE = "visual_milestone";

const visualPlanPointSchema = z.object({
	x: z.number().min(0).max(1),
	y: z.number().min(0).max(1),
});

export const visualPlanAreaSchema = z
	.object({
		id: z.string().min(1).max(100),
		page: z.number().int().positive(),
		polygon: z.array(visualPlanPointSchema).min(3).max(40),
	})
	.strict()
	.refine(
		(area) =>
			polygonArea(area.polygon) >= 0.00001 && isSimplePolygon(area.polygon),
		"Plānotajai zonai jābūt derīgam, nekrustojošam daudzstūrim.",
	);

export const visualPlanAreasSchema = z
	.object({
		version: z.literal(1),
		areas: z.array(visualPlanAreaSchema).min(1).max(50),
		section: visualSectionSchema.nullable().optional(),
	})
	.strict();

export const visualPlanInputSchema = z
	.object({
		siteId: z.string().uuid(),
		id: z.string().uuid().optional(),
		version: z.number().int().positive().optional(),
		drawingId: z.string().uuid(),
		work: z.string().trim().min(1).max(200),
		location: z.string().trim().min(1).max(200),
		unit: z.string().trim().min(1).max(40),
		quantity: z.number().finite().positive().max(1e9),
		startDate: dateSchema,
		endDate: dateSchema,
		contactId: z.string().uuid().nullable().default(null),
		geometry: visualPlanAreasSchema,
	})
	.strict()
	.refine((input) => input.startDate <= input.endDate, {
		message: "Beigu datumam jābūt vienādam ar sākuma datumu vai vēlākam.",
		path: ["endDate"],
	});

export type VisualPlanArea = z.infer<typeof visualPlanAreaSchema>;
export type VisualPlanInput = z.infer<typeof visualPlanInputSchema>;

export type VisualPlan = {
	id: string;
	version: number;
	drawingId: string | null;
	work: string;
	location: string;
	unit: string;
	quantity: number;
	startDate: string;
	endDate: string;
	contactId: string | null;
	geometry: z.infer<typeof visualPlanAreasSchema>;
	geometryReviewRequired: boolean;
	archivedAt: string | null;
};

export type VisualPlanActual = {
	id: string;
	date: string;
	work: string;
	location: string;
	unit: string;
	quantity: number | null;
};

export type VisualPlanProgress = {
	actualIds: string[];
	actualQuantity: number | null;
	progressPercent: number | null;
	variance: number | null;
	dataIncomplete: boolean;
	status: "scheduled" | "active" | "completed" | "overdue";
};

export function visualPlanIntervalsOverlap(
	left: Pick<VisualPlan, "startDate" | "endDate">,
	right: Pick<VisualPlan, "startDate" | "endDate">,
) {
	return left.startDate <= right.endDate && right.startDate <= left.endDate;
}

export function findVisualPlanConflict(
	candidate: Pick<
		VisualPlan,
		"id" | "work" | "location" | "unit" | "startDate" | "endDate"
	>,
	plans: VisualPlan[],
) {
	const key = visualPlanMatchKey(candidate);
	return plans.find(
		(plan) =>
			plan.id !== candidate.id &&
			!plan.archivedAt &&
			visualPlanMatchKey(plan) === key &&
			visualPlanIntervalsOverlap(candidate, plan),
	);
}

export function visualPlanMatchKey(
	plan: Pick<VisualPlan, "work" | "location" | "unit">,
) {
	return planMatchKey(plan.work, plan.location, plan.unit);
}

export function compareVisualPlanProgress(
	plan: Pick<
		VisualPlan,
		"work" | "location" | "unit" | "quantity" | "startDate" | "endDate"
	>,
	actuals: VisualPlanActual[],
	today: string,
): VisualPlanProgress {
	const matchKey = visualPlanMatchKey(plan);
	const matching = actuals.filter(
		(actual) =>
			actual.date >= plan.startDate &&
			actual.date <= today &&
			visualPlanMatchKey(actual) === matchKey,
	);
	const dataIncomplete = matching.some(
		(actual) => actual.quantity === null || !Number.isFinite(actual.quantity),
	);
	const knownQuantity = matching.reduce(
		(sum, actual) => sum + (actual.quantity ?? 0),
		0,
	);
	const actualQuantity = dataIncomplete ? null : knownQuantity;
	const progressPercent =
		actualQuantity === null ? null : (actualQuantity / plan.quantity) * 100;
	const variance =
		actualQuantity === null ? null : actualQuantity - plan.quantity;
	const status =
		actualQuantity !== null && actualQuantity >= plan.quantity
			? "completed"
			: today < plan.startDate
				? "scheduled"
				: today > plan.endDate
					? "overdue"
					: "active";
	return {
		actualIds: matching.map((actual) => actual.id),
		actualQuantity,
		progressPercent,
		variance,
		dataIncomplete,
		status,
	};
}
