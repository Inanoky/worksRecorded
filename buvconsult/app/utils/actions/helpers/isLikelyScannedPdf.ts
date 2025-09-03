// app/utils/actions/helpers/isLikelyScannedPdf.ts
import "server-only";
import { createRequire } from "module";
import { fetchPdfBuffer } from "./fetchPdfBuffer";

const require = createRequire(import.meta.url); // loads from node_modules

export async function isLikelyScannedPdf(url: string): Promise<boolean> {
  const buf = await fetchPdfBuffer(url);
  if (!buf) return true;

  try {
    // ✅ loads real node_modules/pdf-parse (bypasses TS/Jest aliases)
    const pdfParse = require("pdf-parse") as (data: any) => Promise<{ text?: string }>;

    const parsed = await pdfParse(buf);
    const text = (parsed.text ?? "").replace(/\s+/g, " ").trim();
    return text.length < 50;
  } catch (e) {
    console.log("[scan-check] pdf-parse failed:", e);
    return true;
  }
}