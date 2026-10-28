import { z } from "zod";
import {
	isSimplePolygon,
	polygonArea,
	type VisualMark,
	visualPolygonSchema,
} from "./model";

const validPolygon = (points: { x: number; y: number }[]) =>
	polygonArea(points) > 1e-14 && isSimplePolygon(points);
const polygonGroupSchema = z
	.object({
		expected: z
			.array(
				z.object({
					markId: z.string().min(1).max(500),
					polygon: visualPolygonSchema,
				}),
			)
			.min(1)
			.max(256),
		polygons: z
			.array(
				visualPolygonSchema.refine(
					validPolygon,
					"Zonas malām nevajadzētu krustoties.",
				),
			)
			.min(1)
			.max(256),
	})
	.refine(
		(group) =>
			new Set(group.expected.map((item) => item.markId)).size ===
			group.expected.length,
	);
export const polygonEditSchema = z
	.object({
		markId: z.string().min(1).max(500),
		mutationId: z.string().uuid().optional(),
		expectedPolygon: visualPolygonSchema,
		polygon: visualPolygonSchema,
		group: polygonGroupSchema.optional(),
	})
	.superRefine((edit, ctx) => {
		if (
			!validPolygon(edit.polygon) ||
			(!edit.group && polygonArea(edit.polygon) < 0.00001)
		)
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["polygon"],
				message: "Zonas malām nevajadzētu krustoties; zonai jābūt ar laukumu.",
			});
		if (
			edit.group &&
			(!edit.mutationId ||
				!edit.group.expected.some(
					(item) =>
						item.markId === edit.markId &&
						JSON.stringify(item.polygon) ===
							JSON.stringify(edit.expectedPolygon),
				) ||
				JSON.stringify(edit.polygon) !== JSON.stringify(edit.group.polygons[0]))
		)
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["group"],
				message: "Zonas daļas nesakrīt ar rediģējamo ierakstu.",
			});
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
	replacedMarkIds?: string[];
	replacements?: VisualMark[];
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

export const polygonDeleteSchema = z.object({
	markId: z.string().min(1).max(500),
	expectedPolygon: visualPolygonSchema,
});
export type PolygonDelete = z.infer<typeof polygonDeleteSchema>;

export function polygonEditReplacements(
	marks: VisualMark[],
	edit: PolygonEdit,
	editedAt?: string,
	editedBy?: string,
) {
	const primary = marks.find((mark) => mark.id === edit.markId);
	if (!primary) return [];
	const ids = [
		edit.markId,
		...(edit.group?.expected
			.filter((item) => item.markId !== edit.markId)
			.map((item) => item.markId) ?? []),
	];
	return (edit.group?.polygons ?? [edit.polygon]).map((polygon, index) => ({
		...primary,
		id: ids[index] ?? `${edit.mutationId}:zone:${index}`,
		polygon,
		...(editedAt ? { editedAt } : {}),
		...(editedBy ? { editedBy } : {}),
		...(edit.mutationId ? { geometryMutationId: edit.mutationId } : {}),
	}));
}
export function replaceEditedZone(
	marks: VisualMark[],
	ids: string[],
	replacements: VisualMark[],
) {
	const removed = new Set([...ids, ...replacements.map((mark) => mark.id)]);
	const position = marks.findIndex((mark) => removed.has(mark.id));
	const kept = marks.filter((mark) => !removed.has(mark.id));
	kept.splice(
		position < 0 ? kept.length : Math.min(position, kept.length),
		0,
		...replacements,
	);
	return kept;
}
