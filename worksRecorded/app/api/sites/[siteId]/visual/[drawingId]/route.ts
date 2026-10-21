import { NextResponse } from "next/server";
import { analyzeVisualBatch } from "@/flows/default-construction/visual/analyze";
import { compactVisualDrawing } from "@/flows/default-construction/visual/compact-drawing";
import { readVisualPdfBytes } from "@/flows/default-construction/visual/pdf";
import {
	loadVisualDrawing,
	requireVisualAccess,
} from "@/flows/default-construction/visual/store";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

export const runtime = "nodejs";
export const maxDuration = 240;
type Context = { params: Promise<{ siteId: string; drawingId: string }> };

export async function GET(request: Request, context: Context) {
	try {
		const user = await requireUser();
		const { siteId, drawingId } = await context.params;
		if (new URL(request.url).searchParams.get("pdf") === "1") {
			const access = await requireVisualAccess(user.id, siteId);
			const row = await prisma.documents.findFirst({
				where: {
					id: drawingId,
					siteId,
					organizationId: access.organizationId,
					documentType: "limeni-visual-v1",
				},
				select: { url: true },
			});
			if (!row) throw new Error("Drawing unavailable");
			const bytes = await readVisualPdfBytes(row.url);
			return new Response(new Uint8Array(bytes), {
				headers: {
					"Content-Type": "application/pdf",
					"Content-Disposition": "inline",
					"Cache-Control": "private, no-store",
					"X-Content-Type-Options": "nosniff",
				},
			});
		}
		const { drawing } = await loadVisualDrawing(user.id, siteId, drawingId);
		return NextResponse.json(compactVisualDrawing(drawing), {
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
