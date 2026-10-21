import path from "node:path";
import { UTApi } from "uploadthing/server";
import { prisma } from "@/lib/utils/db";
import { drawingScaleLabels } from "./drawing-scale";
import { loadVisualPdf } from "./pdf";
import {
	PREVIEW_DOCUMENT_TYPE,
	preparedPreviewSchema,
} from "./prepared-preview-model";
import { previewSource } from "./preview-revision";

export async function generatePreviewPages(bytes: Uint8Array) {
	const native = await import("@napi-rs/canvas");
	const globals = globalThis as unknown as Record<string, unknown>;
	for (const key of ["DOMMatrix", "ImageData", "Path2D"] as const)
		globals[key] ??= native[key];
	const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
	const assets = path.join(process.cwd(), "node_modules/pdfjs-dist");
	const task = pdfjs.getDocument({
		data: new Uint8Array(bytes),
		useSystemFonts: true,
		standardFontDataUrl: `${assets}/standard_fonts/`,
		cMapUrl: `${assets}/cmaps/`,
		cMapPacked: true,
		wasmUrl: `${assets}/wasm/`,
	});
	try {
		const pdf = await task.promise;
		if (pdf.numPages > 10) throw new Error("Too many drawing pages");
		const pages = [];
		for (let page = 1; page <= pdf.numPages; page++) {
			const documentPage = await pdf.getPage(page);
			const base = documentPage.getViewport({ scale: 1 });
			const scale = Math.min(
				1600 / base.width,
				Math.sqrt(2_000_000 / (base.width * base.height)),
			);
			const viewport = documentPage.getViewport({ scale });
			const canvas = native.createCanvas(
				Math.ceil(viewport.width),
				Math.ceil(viewport.height),
			);
			await documentPage.render({
				canvas: canvas as unknown as HTMLCanvasElement,
				canvasContext: canvas.getContext(
					"2d",
				) as unknown as CanvasRenderingContext2D,
				viewport,
				transform: [
					canvas.width / viewport.width,
					0,
					0,
					canvas.height / viewport.height,
					0,
					0,
				],
			}).promise;
			const content = await documentPage.getTextContent();
			const scales = drawingScaleLabels(
				content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
			);
			pages.push({
				page,
				width: base.width,
				height: base.height,
				scales,
				bytes: await canvas.encode("webp", 88),
			});
			canvas.width = 1;
			canvas.height = 1;
			documentPage.cleanup();
		}
		return pages;
	} finally {
		await task.destroy();
	}
}

export async function prepareVisualDrawingPreviews(drawingId: string) {
	const row = await prisma.documents.findUniqueOrThrow({
		where: { id: drawingId },
	});
	if (
		row.documentType !== "limeni-visual-v1" ||
		!row.siteId ||
		!row.organizationId
	)
		throw new Error("Drawing unavailable");
	const source = previewSource(row.url);
	const id = `visual-preview:${drawingId}:${source}`;
	const existing = await prisma.documents.findUnique({ where: { id } });
	if (existing)
		return preparedPreviewSchema.parse(JSON.parse(existing.description));
	const { bytes } = await loadVisualPdf(row.url);
	const pages = await generatePreviewPages(bytes);
	const storage = new UTApi();
	const uploaded = await storage.uploadFiles(
		pages.map(
			(page) =>
				new File(
					[new Uint8Array(page.bytes)],
					`${drawingId}-page-${page.page}.webp`,
					{ type: "image/webp" },
				),
		),
		{ concurrency: 2 },
	);
	if (uploaded.some((item) => item.error || !item.data))
		throw new Error("Preview upload failed");
	const manifest = preparedPreviewSchema.parse({
		version: 1,
		source,
		pages: pages.map((page, index) => ({
			page: page.page,
			width: page.width,
			height: page.height,
			scales: page.scales,
			url: uploaded[index].data?.ufsUrl,
		})),
	});
	await prisma.$transaction(async (tx) => {
		const current = await tx.documents.findUnique({ where: { id: drawingId } });
		if (
			!current ||
			current.url !== row.url ||
			current.documentType !== row.documentType
		)
			throw new Error("Drawing replaced during preview preparation");
		await tx.documents.upsert({
			where: { id },
			create: {
				id,
				siteId: row.siteId,
				organizationId: row.organizationId,
				userId: row.userId,
				documentName: drawingId,
				documentType: PREVIEW_DOCUMENT_TYPE,
				url: row.url,
				description: JSON.stringify(manifest),
			},
			update: {},
		});
	});
	return manifest;
}
