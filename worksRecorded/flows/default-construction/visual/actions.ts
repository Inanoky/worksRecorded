"use server";

import { requireUser } from "@/lib/utils/requireUser";
import {
	createVisualDrawing,
	listVisualDrawings,
	loadVisualDrawing,
} from "./store";

export async function getVisualDrawings(siteId: string) {
	const user = await requireUser();
	return listVisualDrawings(user.id, siteId);
}

export async function refreshVisualDrawing(siteId: string, drawingId: string) {
	const user = await requireUser();
	const { row, drawing } = await loadVisualDrawing(user.id, siteId, drawingId);
	return createVisualDrawing({
		userId: user.id,
		siteId,
		location: drawing.state.location,
		url: row.url,
		name: row.documentName,
	});
}
