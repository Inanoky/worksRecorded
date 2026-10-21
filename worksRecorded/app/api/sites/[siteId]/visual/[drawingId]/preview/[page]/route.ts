import {
	PREVIEW_DOCUMENT_TYPE,
	preparedPreviewSchema,
} from "@/flows/default-construction/visual/prepared-preview-model";
import { previewSource } from "@/flows/default-construction/visual/preview-revision";
import { requireVisualAccess } from "@/flows/default-construction/visual/store";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

export const runtime = "nodejs";

export async function GET(
	request: Request,
	{
		params,
	}: { params: Promise<{ siteId: string; drawingId: string; page: string }> },
) {
	try {
		const { siteId, drawingId, page } = await params;
		const user = await requireUser();
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
		const source = previewSource(row.url);
		if (
			new URL(request.url).searchParams.get("v") !== source ||
			!/^[1-9]\d?$/.test(page)
		)
			throw new Error("Preview version unavailable");
		const stored = await prisma.documents.findFirst({
			where: {
				id: `visual-preview:${drawingId}:${source}`,
				siteId,
				organizationId: access.organizationId,
				documentType: PREVIEW_DOCUMENT_TYPE,
			},
		});
		const manifest = preparedPreviewSchema.parse(
			stored ? JSON.parse(stored.description) : null,
		);
		const image = manifest.pages.find((item) => item.page === Number(page));
		if (!image) throw new Error("Page unavailable");
		const url = new URL(image.url);
		if (
			url.protocol !== "https:" ||
			!(url.hostname.endsWith(".ufs.sh") || url.hostname === "utfs.io")
		)
			throw new Error("Invalid image");
		const response = await fetch(url, {
			redirect: "error",
			signal: AbortSignal.timeout(20_000),
		});
		if (!response.ok) throw new Error("Preview unavailable");
		return new Response(response.body, {
			headers: {
				"Content-Type": "image/webp",
				"Cache-Control": "private, no-store",
				"X-Content-Type-Options": "nosniff",
			},
		});
	} catch {
		return new Response(null, { status: 404 });
	}
}
