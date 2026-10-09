"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/utils/requireUser";
import {
	appendVisualDiaryEvidence,
	editVisualPolygon,
	editVisualWorkType,
	listVisualDrawings,
	listVisualWorkTypes,
	removeVisualDrawing,
	resetVisualDrawing,
	reviewVisualSource,
} from "./store";

export async function getVisualDrawings(siteId: string) {
	const user = await requireUser();
	return listVisualDrawings(user.id, siteId);
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
	return editVisualPolygon(user.id, siteId, drawingId, input);
}
