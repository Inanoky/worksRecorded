"use server";

import { requireUser } from "@/lib/utils/requireUser";
import {
	appendVisualDiaryEvidence,
	editVisualPolygon,
	listVisualDrawings,
	removeVisualDrawing,
	resetVisualDrawing,
} from "./store";

export async function getVisualDrawings(siteId: string) {
	const user = await requireUser();
	return listVisualDrawings(user.id, siteId);
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
