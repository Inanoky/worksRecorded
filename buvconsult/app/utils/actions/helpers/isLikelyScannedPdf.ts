// app/utils/actions/helpers/isLikelyScannedPdf.ts
import "server-only";
import { fetchPdfBuffer } from "./fetchPdfBuffer";
import { getDocument} from "pdfjs-dist/legacy/build/pdf";

export async function isLikelyScannedPdf(url: string): Promise<boolean> {
  const buf = await fetchPdfBuffer(url);
  if (!buf) {
    console.log("[scan-check] no buffer -> treating as scanned");
    return true;
  }

  try {
    const loadingTask = getDocument({ data: buf });
    const pdf = await loadingTask.promise;

    let text = "";
    const pagesToSample = Math.min(5, pdf.numPages || 1);
    for (let i = 1; i <= pagesToSample; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it: any) => it.str || "").join(" ") + " ";
      if (text.length > 300) break; // enough sample
    }

    text = text.replace(/\s+/g, " ").trim();
    console.log("[scan-check] extracted sample length:", text.length);
    // threshold: treat as scanned (image-only) when very little text
    return text.length < 50;
  } catch (err) {
    console.log("[scan-check] pdfjs parse failed:", err && (err as any).stack ? (err as any).stack : err);
    return true;
  }
}
