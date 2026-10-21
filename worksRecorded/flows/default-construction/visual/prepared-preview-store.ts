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

export async function generatePreviewPages(
	bytes: Uint8Array,
	maxPixels = 12_000_000,
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
		const pages = [];
		for (let page = 1; page <= pdf.numPages; page++) {
			const documentPage = await pdf.getPage(page);
			const base = documentPage.getViewport({ scale: 1 });
			const scale = Math.min(
				7168 / base.width,
				7168 / base.height,
				Math.sqrt(maxPixels / (base.width * base.height)),
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
			const overviewWidth = Math.max(
				1,
				Math.floor(
					Math.min(
						1600,
						canvas.width,
						Math.sqrt((2_000_000 * base.width) / base.height),
					),
				),
			);
			const overviewHeight = Math.max(
				1,
				Math.round((overviewWidth * base.height) / base.width),
			);
			const overview = native.createCanvas(overviewWidth, overviewHeight);
			overview
				.getContext("2d")
				.drawImage(canvas, 0, 0, overviewWidth, overviewHeight);
			const levels = [];
			for (const divisor of [4, 2, 1]) {
				const width = Math.ceil(canvas.width / divisor);
				const height = Math.ceil(canvas.height / divisor);
				const level = native.createCanvas(width, height);
				level.getContext("2d").drawImage(canvas, 0, 0, width, height);
				const tiles = [];
				for (let y = 0; y < height; y += 1024)
					for (let x = 0; x < width; x += 1024) {
						const tile = native.createCanvas(
							Math.min(1024, width - x),
							Math.min(1024, height - y),
						);
						tile
							.getContext("2d")
							.drawImage(
								level,
								x,
								y,
								tile.width,
								tile.height,
								0,
								0,
								tile.width,
								tile.height,
							);
						tiles.push(await tile.encode("webp", 90));
						tile.width = 1;
						tile.height = 1;
					}
				levels.push({ width, height, tiles });
				level.width = 1;
				level.height = 1;
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
			canvas.width = 1;
			canvas.height = 1;
			documentPage.cleanup();
		}
		return pages;
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
						`${drawingId}-${page.page}-${index}-${ordinal}.webp`,
						{ type: "image/webp" },
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
				size: 1024,
				levels: layouts[index].levels.map((level) => ({
					width: level.width,
					height: level.height,
					urls: level.indices.map((offset) => uploaded[offset].data?.ufsUrl),
				})),
			},
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
			update: { description: JSON.stringify(manifest) },
		});
	});
	return manifest;
}
