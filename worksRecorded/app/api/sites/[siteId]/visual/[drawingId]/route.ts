import { NextResponse } from "next/server";
import { analyzeVisualBatch } from "@/flows/default-construction/visual/analyze";
import { loadVisualPdf } from "@/flows/default-construction/visual/pdf";
import { loadVisualDrawing } from "@/flows/default-construction/visual/store";
import { requireUser } from "@/lib/utils/requireUser";

export const runtime = "nodejs";
export const maxDuration = 240;
type Context = { params: Promise<{ siteId: string; drawingId: string }> };

export async function GET(request: Request, context: Context) {
	try {
		const user = await requireUser();
		const { siteId, drawingId } = await context.params;
		const { row, drawing } = await loadVisualDrawing(
			user.id,
			siteId,
			drawingId,
		);
		if (new URL(request.url).searchParams.get("pdf") === "1") {
			const { bytes } = await loadVisualPdf(row.url);
			return new Response(new Uint8Array(bytes), {
				headers: {
					"Content-Type": "application/pdf",
					"Content-Disposition": "inline",
					"Cache-Control": "private, no-store",
					"X-Content-Type-Options": "nosniff",
				},
			});
		}
		return NextResponse.json(drawing, {
			headers: { "Cache-Control": "private, no-store" },
		});
	} catch {
		return NextResponse.json(
			{
				error:
					"Neizdevās ielādēt rasējumu. Pārbaudiet projekta piekļuvi un PDF failu.",
			},
			{ status: 400 },
		);
	}
}

export async function POST(request: Request, context: Context) {
	const origin = request.headers.get("origin");
	if (!origin || origin !== new URL(request.url).origin)
		return NextResponse.json({ error: "Piekļuve liegta." }, { status: 403 });
	try {
		const user = await requireUser();
		const { siteId, drawingId } = await context.params;
		return NextResponse.json(
			await analyzeVisualBatch(user.id, siteId, drawingId),
			{ headers: { "Cache-Control": "private, no-store" } },
		);
	} catch {
		return NextResponse.json(
			{
				error:
					"Neizdevās sākt analīzi. Tā var jau notikt citā logā. Pārlādējiet Visual skatu.",
			},
			{ status: 409 },
		);
	}
}
