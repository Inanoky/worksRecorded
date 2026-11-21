import { NextResponse } from "next/server";
import { analyzeVisualBatch } from "@/flows/default-construction/visual/analyze";
import { compactVisualDrawing } from "@/flows/default-construction/visual/compact-drawing";
import { VISUAL_DOCUMENT_TYPE } from "@/flows/default-construction/visual/model";
import { readVisualPdfBytes } from "@/flows/default-construction/visual/pdf";
import { drawingFileRevision } from "@/flows/default-construction/visual/preview-revision";
import {
	readSectionBoundaries,
	saveSectionBoundaries,
	sectionBoundaryEditSchema,
} from "@/flows/default-construction/visual/section-boundary-store";
import {
	loadVisualDrawing,
	requireVisualAccess,
} from "@/flows/default-construction/visual/store";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

export const runtime = "nodejs";
export const maxDuration = 240;
type Context = { params: Promise<{ siteId: string; drawingId: string }> };
const privateResponse = { headers: { "Cache-Control": "private, no-store" } };

function findVisualDrawing(
	siteId: string,
	drawingId: string,
	organizationId: string,
) {
	return prisma.documents.findFirst({
		where: {
			id: drawingId,
			siteId,
			organizationId,
			documentType: VISUAL_DOCUMENT_TYPE,
		},
		select: { url: true },
	});
}

export async function GET(request: Request, context: Context) {
	try {
		const user = await requireUser();
		const { siteId, drawingId } = await context.params;
		const query = new URL(request.url).searchParams;
		if (query.get("pdf") === "1" || query.get("boundaries") === "1") {
			const access = await requireVisualAccess(user.id, siteId);
			const row = await findVisualDrawing(
				siteId,
				drawingId,
				access.organizationId,
			);
			if (!row) throw new Error("Drawing unavailable");
			if (query.get("boundaries") === "1")
				return NextResponse.json(
					await readSectionBoundaries(
						siteId,
						drawingId,
						drawingFileRevision(row.url),
						access.organizationId,
					),
					privateResponse,
				);
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

export async function PATCH(request: Request, context: Context) {
	const url = new URL(request.url);
	if (request.headers.get("origin") !== url.origin)
		return NextResponse.json({ error: "Piekļuve liegta." }, { status: 403 });
	if (url.searchParams.get("boundaries") !== "1")
		return NextResponse.json(
			{ error: "Darbība nav pieejama." },
			{ status: 404 },
		);

	let access: Awaited<ReturnType<typeof requireVisualAccess>>;
	const { siteId, drawingId } = await context.params;
	try {
		const user = await requireUser();
		access = await requireVisualAccess(user.id, siteId);
	} catch {
		return NextResponse.json({ error: "Piekļuve liegta." }, { status: 403 });
	}
	const input = await request.text();
	if (input.length > 1_000_000)
		return NextResponse.json(
			{ error: "Karte ir pārāk liela." },
			{ status: 413 },
		);
	let raw: unknown;
	try {
		raw = JSON.parse(input);
	} catch {
		return NextResponse.json(
			{ error: "Nederīgi kartes dati." },
			{ status: 400 },
		);
	}
	const edit = sectionBoundaryEditSchema.safeParse(raw);
	if (!edit.success)
		return NextResponse.json(
			{ error: "Nederīgas sekciju robežas." },
			{ status: 422 },
		);

	try {
		const row = await findVisualDrawing(
			siteId,
			drawingId,
			access.organizationId,
		);
		if (!row)
			return NextResponse.json(
				{ error: "Rasējums nav atrasts." },
				{ status: 404 },
			);
		const result = await saveSectionBoundaries({
			siteId,
			drawingId,
			organizationId: access.organizationId,
			userId: access.userId,
			pdfRevision: drawingFileRevision(row.url),
			edit: edit.data,
		});
		return "error" in result
			? NextResponse.json(
					{ error: result.error },
					{ ...privateResponse, status: result.status },
				)
			: NextResponse.json(result.map, privateResponse);
	} catch {
		return NextResponse.json(
			{ error: "Neizdevās saglabāt sekciju robežas." },
			{ status: 500 },
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
