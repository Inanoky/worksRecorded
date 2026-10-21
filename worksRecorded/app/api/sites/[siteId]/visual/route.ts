import { getVisualDrawings } from "@/flows/default-construction/visual/actions";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
) {
	try {
		const { siteId } = await params;
		return Response.json(await getVisualDrawings(siteId), {
			headers: { "Cache-Control": "private, no-store" },
		});
	} catch {
		return Response.json(
			{ error: "Neizdevās ielādēt rasējumus." },
			{ status: 403 },
		);
	}
}
