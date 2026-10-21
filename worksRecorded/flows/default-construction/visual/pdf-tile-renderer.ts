import { readFile } from "node:fs/promises";
import path from "node:path";
import { init } from "@embedpdf/pdfium";
import { createCanvas, ImageData } from "@napi-rs/canvas";

let engine: ReturnType<typeof init> | undefined;

export async function openPdfTileRenderer(bytes: Uint8Array) {
	engine ??= readFile(
		path.join(process.cwd(), "node_modules/@embedpdf/pdfium/dist/pdfium.wasm"),
	)
		.then((wasmBinary) => init({ wasmBinary }))
		.then((module) => {
			module.PDFiumExt_Init();
			return module;
		})
		.catch((error) => {
			engine = undefined;
			throw error;
		});
	const pdfium = await engine;
	const runtime = pdfium.pdfium as typeof pdfium.pdfium & {
		HEAPU8: Uint8Array;
	};
	const memory = runtime.wasmExports;
	const file = memory.malloc(bytes.length);
	if (!file) throw new Error("PDF memory unavailable");
	runtime.HEAPU8.set(bytes, file);
	const document = pdfium.FPDF_LoadMemDocument(file, bytes.length, "");
	if (!document) {
		memory.free(file);
		throw new Error("PDF rendering unavailable");
	}
	const pages = new Map<number, number>();
	return {
		render(
			page: number,
			pageWidth: number,
			pageHeight: number,
			left: number,
			top: number,
			width: number,
			height: number,
		) {
			let pointer = pages.get(page);
			if (!pointer) {
				pointer = pdfium.FPDF_LoadPage(document, page - 1);
				if (!pointer) throw new Error("PDF page unavailable");
				pages.set(page, pointer);
			}
			const bitmap = pdfium.FPDFBitmap_Create(width, height, 1);
			if (!bitmap) throw new Error("Drawing tile memory unavailable");
			try {
				pdfium.FPDFBitmap_FillRect(bitmap, 0, 0, width, height, 0xffffffff);
				pdfium.FPDF_RenderPageBitmap(
					bitmap,
					pointer,
					-left,
					-top,
					pageWidth,
					pageHeight,
					0,
					17,
				);
				const buffer = pdfium.FPDFBitmap_GetBuffer(bitmap);
				const pixels = new Uint8ClampedArray(
					runtime.HEAPU8.slice(buffer, buffer + width * height * 4),
				);
				const canvas = createCanvas(width, height);
				canvas
					.getContext("2d")
					.putImageData(new ImageData(pixels, width, height), 0, 0);
				return canvas;
			} finally {
				pdfium.FPDFBitmap_Destroy(bitmap);
			}
		},
		close() {
			for (const pointer of pages.values()) pdfium.FPDF_ClosePage(pointer);
			pages.clear();
			pdfium.FPDF_CloseDocument(document);
			memory.free(file);
		},
	};
}
