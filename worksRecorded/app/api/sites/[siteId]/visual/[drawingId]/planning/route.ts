import { getVisualPlanning } from "@/flows/default-construction/visual/actions";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ siteId: string; drawingId: string }> },
) {
	try {
		const { siteId, drawingId } = await params;
		return Response.json(await getVisualPlanning(siteId, drawingId), {
			headers: { "Cache-Control": "private, no-store" },
		});
	} catch {
		return Response.json(
			{ error: "Neizdevās ielādēt plānotos darbus." },
			{ status: 403 },
		);
	}
}
