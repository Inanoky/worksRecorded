import type {
	VisualDrawingIndex,
	VisualPlanningIndex,
} from "./visual-client-cache";

async function read<T>(url: string): Promise<T> {
	const response = await fetch(url, { cache: "no-store" });
	if (!response.ok) throw new Error("Project data unavailable");
	return response.json();
}

export function fetchVisualIndex(siteId: string) {
	return read<VisualDrawingIndex>(
		`/api/sites/${encodeURIComponent(siteId)}/visual`,
	);
}

export function fetchVisualPlanning(siteId: string, drawingId: string) {
	return read<VisualPlanningIndex>(
		`/api/sites/${encodeURIComponent(siteId)}/visual/${encodeURIComponent(drawingId)}/planning`,
	);
}
