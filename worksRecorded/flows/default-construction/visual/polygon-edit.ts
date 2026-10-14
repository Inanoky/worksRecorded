import { z } from "zod";
import { isSimplePolygon, polygonArea, visualMatchSchema } from "./model";

export const polygonEditSchema = z.object({
	markId: z.string().min(1).max(500),
	mutationId: z.string().uuid().optional(),
	expectedPolygon: visualMatchSchema.shape.polygon,
	polygon: visualMatchSchema.shape.polygon.refine(
		(points) => polygonArea(points) >= 0.00001 && isSimplePolygon(points),
		"Zonas malām nevajadzētu krustoties; zonai jābūt ar laukumu.",
	),
});
export type PolygonEdit = z.infer<typeof polygonEditSchema>;

export type PolygonSaveResult = {
	drawingId: string;
	markId: string;
	polygon: PolygonEdit["polygon"];
	editedAt: string | null;
	editedBy: string | null;
	mutationId: string | null;
	geometryMutationId?: string | null;
};

export type PolygonSaveResponse =
	| { ok: true; result: PolygonSaveResult }
	| { ok: false; code: "conflict" | "error"; error: string };

export class PolygonSaveConflictError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "PolygonSaveConflictError";
	}
}

export const polygonDeleteSchema = polygonEditSchema.pick({
	markId: true,
	expectedPolygon: true,
});
export type PolygonDelete = z.infer<typeof polygonDeleteSchema>;
