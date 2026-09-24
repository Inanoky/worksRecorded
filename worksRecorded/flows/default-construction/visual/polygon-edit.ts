import { z } from "zod";
import { isSimplePolygon, polygonArea, visualMatchSchema } from "./model";

export const polygonEditSchema = z.object({
	markId: z.string().min(1).max(500),
	expectedPolygon: visualMatchSchema.shape.polygon,
	polygon: visualMatchSchema.shape.polygon.refine(
		(points) => polygonArea(points) >= 0.00001 && isSimplePolygon(points),
		"Zonas malām nevajadzētu krustoties; zonai jābūt ar laukumu.",
	),
});
export type PolygonEdit = z.infer<typeof polygonEditSchema>;
