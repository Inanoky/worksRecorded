"use server";

import { revalidatePath } from "next/cache";
import { createPerfTrace } from "@/lib/observability/perf";
import { requireUser } from "@/lib/utils/requireUser";
import { persistVisualLayers } from "./layer-store";
import {
	archiveVisualPlan,
	listVisualPlans,
	persistVisualPlan,
	restoreVisualPlan,
	VisualPlanConflictError,
} from "./planning-store";
import {
	PolygonSaveConflictError,
	type PolygonSaveResponse,
} from "./polygon-edit";
import {
	appendVisualDiaryEvidence,
	editVisualPolygon,
	editVisualWorkType,
	listVisualDrawings,
	listVisualWorkTypes,
	loadVisualDrawing,
	removeVisualDrawing,
	removeVisualPolygon,
	resetVisualDrawing,
	reviewVisualSource,
} from "./store";

export async function getVisualDrawings(
	siteId: string,
): Promise<
	Awaited<ReturnType<typeof listVisualDrawings>> & { userId?: string }
> {
	const user = await requireUser();
	return { ...(await listVisualDrawings(user.id, siteId)), userId: user.id };
}

export async function saveVisualLayers(
	siteId: string,
	input: unknown,
	expected: unknown,
) {
	const user = await requireUser();
	const settings = await persistVisualLayers(user.id, siteId, input, expected);
	revalidatePath(`/dashboard/sites/${siteId}/izpildshemas`);
	return settings;
}

export async function getVisualWorkTypes(siteId: string) {
	const user = await requireUser();
	return listVisualWorkTypes(user.id, siteId);
}

export async function saveVisualWorkType(
	siteId: string,
	drawingId: string,
	input: unknown,
) {
	const user = await requireUser();
	const result = await editVisualWorkType(user.id, siteId, drawingId, input);
	revalidatePath(`/dashboard/sites/${siteId}/dashboard`);
	return result;
}

export async function resolveVisualSourceReview(
	siteId: string,
	drawingId: string,
	evidenceId: string,
	reanalyze: boolean,
) {
	const user = await requireUser();
	return reviewVisualSource(user.id, siteId, drawingId, evidenceId, reanalyze);
}

export async function refreshVisualDrawing(siteId: string, drawingId: string) {
	const user = await requireUser();
	return appendVisualDiaryEvidence(user.id, siteId, drawingId);
}

export async function deleteVisualDrawing(siteId: string, drawingId: string) {
	const user = await requireUser();
	await removeVisualDrawing(user.id, siteId, drawingId);
}

export async function restartVisualDrawing(siteId: string, drawingId: string) {
	const user = await requireUser();
	return resetVisualDrawing(user.id, siteId, drawingId);
}

export async function saveVisualPolygon(
	siteId: string,
	drawingId: string,
	input: unknown,
) {
	const user = await requireUser();
	await editVisualPolygon(user.id, siteId, drawingId, input);
	return (await loadVisualDrawing(user.id, siteId, drawingId)).drawing;
}

export async function saveVisualPolygonPatch(
	siteId: string,
	drawingId: string,
	input: unknown,
): Promise<PolygonSaveResponse> {
	const trace = createPerfTrace({
		route: "limeni.visual.polygon.save",
		category: "action",
		siteId,
	});
	const user = await trace.measure("session", requireUser);
	try {
		const result = await editVisualPolygon(
			user.id,
			siteId,
			drawingId,
			input,
			trace,
		);
		const response = await trace.measure("response", () =>
			JSON.stringify(result),
		);
		trace.end({
			status: 200,
			extra: {
				drawingId,
				markId: result.markId,
				responseBytes: Buffer.byteLength(response),
			},
		});
		return { ok: true, result };
	} catch (error) {
		const conflict = error instanceof PolygonSaveConflictError;
		trace.fail(error, { status: conflict ? 409 : 500, extra: { drawingId } });
		return {
			ok: false,
			code: conflict ? "conflict" : "error",
			error: conflict
				? error.message
				: "Neizdevās saglabāt zonu. Labojums ir saglabāts šajā logā; mēģiniet vēlreiz.",
		};
	}
}

export async function getVisualPlanning(siteId: string, drawingId: string) {
	const user = await requireUser();
	return listVisualPlans(user.id, siteId, drawingId);
}

function revalidateVisualPlanning(siteId: unknown) {
	if (typeof siteId !== "string") return;
	revalidatePath(`/dashboard/sites/${siteId}/izpildshemas`);
	revalidatePath(`/dashboard/sites/${siteId}/siteDiary`);
	revalidatePath(`/dashboard/sites/${siteId}/dashboard`);
}

function planningFailure(error: unknown) {
	if (error instanceof VisualPlanConflictError)
		return {
			ok: false as const,
			code: "overlap" as const,
			error: error.message,
			conflict: error.conflict,
		};
	if (error instanceof Error)
		return {
			ok: false as const,
			code: "invalid" as const,
			error: error.message,
		};
	return {
		ok: false as const,
		code: "invalid" as const,
		error: "Neizdevās saglabāt plānoto darbu.",
	};
}

export async function saveVisualPlanningItem(input: unknown) {
	const user = await requireUser();
	try {
		const plan = await persistVisualPlan(user.id, input);
		revalidateVisualPlanning((input as { siteId?: unknown })?.siteId);
		return { ok: true as const, plan };
	} catch (error) {
		return planningFailure(error);
	}
}

export async function archiveVisualPlanningItem(input: unknown) {
	const user = await requireUser();
	try {
		const plan = await archiveVisualPlan(user.id, input);
		revalidateVisualPlanning((input as { siteId?: unknown })?.siteId);
		return { ok: true as const, plan };
	} catch (error) {
		return planningFailure(error);
	}
}

export async function restoreVisualPlanningItem(input: unknown) {
	const user = await requireUser();
	try {
		const plan = await restoreVisualPlan(user.id, input);
		revalidateVisualPlanning((input as { siteId?: unknown })?.siteId);
		return { ok: true as const, plan };
	} catch (error) {
		return planningFailure(error);
	}
}

export async function deleteVisualPolygon(
	siteId: string,
	drawingId: string,
	input: unknown,
) {
	const user = await requireUser();
	return removeVisualPolygon(user.id, siteId, drawingId, input);
}
