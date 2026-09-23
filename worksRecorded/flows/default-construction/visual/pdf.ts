import { PDFDocument } from "pdf-lib";
import { VISUAL_MAX_BYTES, VISUAL_MAX_PAGES } from "./model";

export async function loadVisualPdf(url: string) {
	const parsed = new URL(url);
	if (
		parsed.protocol !== "https:" ||
		parsed.username ||
		parsed.password ||
		parsed.port ||
		!(parsed.hostname.endsWith(".ufs.sh") || parsed.hostname === "utfs.io")
	)
		throw new Error("Nederīga rasējuma adrese.");
	const response = await fetch(parsed, {
		redirect: "error",
		signal: AbortSignal.timeout(30_000),
		cache: "no-store",
	});
	if (!response.ok || !response.body) throw new Error("Neizdevās ielādēt PDF.");
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let length = 0;
	try {
		while (true) {
			const next = await reader.read();
			if (next.done) break;
			length += next.value.byteLength;
			if (length > VISUAL_MAX_BYTES) throw new Error("PDF pārsniedz 16 MB.");
			chunks.push(next.value);
		}
	} finally {
		await reader.cancel();
	}
	const bytes = Buffer.concat(chunks);
	if (!bytes.subarray(0, 1024).includes(Buffer.from("%PDF-")))
		throw new Error("Fails nav PDF.");
	const document = await PDFDocument.load(bytes);
	const pageCount = document.getPageCount();
	if (pageCount < 1 || pageCount > VISUAL_MAX_PAGES)
		throw new Error(
			`Lūdzu, augšupielādējiet lokācijas rasējumu ar ne vairāk kā ${VISUAL_MAX_PAGES} lapām.`,
		);
	return { bytes, pageCount };
}
