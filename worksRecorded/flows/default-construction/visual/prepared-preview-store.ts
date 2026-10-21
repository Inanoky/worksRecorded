import path from "node:path";
import { UTApi } from "uploadthing/server";
import { prisma } from "@/lib/utils/db";
import { drawingScaleLabels } from "./drawing-scale";
import { loadVisualPdf } from "./pdf";
import { openPdfTileRenderer } from "./pdf-tile-renderer";
import {
	PREVIEW_DOCUMENT_TYPE,
	preparedPreviewSchema,
} from "./prepared-preview-model";
import { previewSource } from "./preview-revision";

export async function generatePreviewPages(
	bytes: Uint8Array,
	maxPixels = 192_000_000,
) {
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
		const renderer = await openPdfTileRenderer(bytes);
		try {
			const pages = [];
			for (let page = 1; page <= pdf.numPages; page++) {
				const documentPage = await pdf.getPage(page);
				const base = documentPage.getViewport({ scale: 1 });
				const scale = Math.min(
					16384 / base.width,
					16384 / base.height,
					Math.sqrt(maxPixels / (base.width * base.height)),
				);
				const width = Math.min(16384, Math.ceil(base.width * scale));
				const height = Math.min(16384, Math.ceil(base.height * scale));
				const content = await documentPage.getTextContent();
				const scales = drawingScaleLabels(
					content.items
						.map((item) => ("str" in item ? item.str : ""))
						.join(" "),
				);
				const overviewWidth = Math.max(
					1,
					Math.floor(
						Math.min(
							1600,
							width,
							Math.sqrt((2_000_000 * base.width) / base.height),
						),
					),
				);
				const overviewHeight = Math.max(
					1,
					Math.round((overviewWidth * base.height) / base.width),
				);
				const overview = renderer.render(
					page,
					overviewWidth,
					overviewHeight,
					0,
					0,
					overviewWidth,
					overviewHeight,
				);
				const levels = [];
				for (const divisor of [8, 4, 2, 1]) {
					const levelWidth = Math.ceil(width / divisor);
					const levelHeight = Math.ceil(height / divisor);
					const tiles = [];
					for (let y = 0; y < levelHeight; y += 1024)
						for (let x = 0; x < levelWidth; x += 1024) {
							const tile = renderer.render(
								page,
								levelWidth,
								levelHeight,
								x,
								y,
								Math.min(1024, levelWidth - x),
								Math.min(1024, levelHeight - y),
							);
							tiles.push(await tile.encode("png"));
							tile.width = 1;
							tile.height = 1;
						}
					levels.push({ width: levelWidth, height: levelHeight, tiles });
				}
				pages.push({
					page,
					width: base.width,
					height: base.height,
					scales,
					bytes: await overview.encode("webp", 88),
					levels,
				});
				overview.width = 1;
				overview.height = 1;
				documentPage.cleanup();
			}
			return pages;
		} finally {
			renderer.close();
		}
	} finally {
		await task.destroy();
	}
}

export async function prepareVisualDrawingPreviews(
	drawingId: string,
	maxPixels?: number,
) {
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
	const saved = existing
		? preparedPreviewSchema.parse(JSON.parse(existing.description))
		: null;
	if (saved?.pages.every((page) => page.tiles)) return saved;
	const { bytes } = await loadVisualPdf(row.url);
	const pages = await generatePreviewPages(bytes, maxPixels);
	const storage = new UTApi();
	const files: File[] = [];
	const layouts = pages.map((page) => {
		const overview = files.length;
		files.push(
			new File([new Uint8Array(page.bytes)], `${drawingId}-${page.page}.webp`, {
				type: "image/webp",
			}),
		);
		const levels = page.levels.map((level, index) => ({
			width: level.width,
			height: level.height,
			indices: level.tiles.map((bytes, ordinal) => {
				const offset = files.length;
				files.push(
					new File(
						[new Uint8Array(bytes)],
						`${drawingId}-${page.page}-${index}-${ordinal}.png`,
						{ type: "image/png" },
					),
				);
				return offset;
			}),
		}));
		return { overview, levels };
	});
	const uploaded = await storage.uploadFiles(files, { concurrency: 4 });
	if (uploaded.some((item) => item.error || !item.data))
		throw new Error("Drawing tile upload failed");
	const manifest = preparedPreviewSchema.parse({
		version: 1,
		source,
		pages: pages.map((page, index) => ({
			page: page.page,
			width: page.width,
			height: page.height,
			scales: page.scales,
			url: uploaded[layouts[index].overview].data?.ufsUrl,
			tiles: {
				version: 1,
				format: "png",
				size: 1024,
				levels: layouts[index].levels.map((level) => ({
					width: level.width,
					height: level.height,
					urls: level.indices.map((offset) => uploaded[offset].data?.ufsUrl),
				})),
			},
		})),
	});
	await prisma.$transaction(
		async (tx) => {
			const current = await tx.documents.findUnique({
				where: { id: drawingId },
			});
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
				update: { description: JSON.stringify(manifest) },
			});
		},
		{ timeout: 30_000, maxWait: 10_000 },
	);
	return manifest;
}
