import type { PlanningImage } from "./planning-image";

export async function fetchSectionDrawing(
	siteId: string,
	section: string,
	signal: AbortSignal,
): Promise<PlanningImage> {
	const query = new URLSearchParams({ section });
	const response = await fetch(
		`/api/sites/${encodeURIComponent(siteId)}/visual/section-drawing?${query}`,
		{ signal, cache: "no-store" },
	);
	if (
		!response.ok ||
		!response.headers.get("content-type")?.startsWith("image/png")
	)
		throw new Error("Neizdevās ielādēt izvēlētās sekcijas rasējumu.");
	const blob = await response.blob();
	signal.throwIfAborted();
	return { page: 11, section, blob };
}
