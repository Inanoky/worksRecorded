// app/utils/actions/helpers/isLikelyScannedPdf.ts
import "server-only";
import { createRequire } from "module";
import { fetchPdfBuffer } from "./fetchPdfBuffer";

const require = createRequire(import.meta.url); // loads from node_modules

export async function isLikelyScannedPdf(url: string): Promise<boolean> {
  console.log("[scan-check] start - url:", url);

  const buf = await fetchPdfBuffer(url);
  console.log("[scan-check] fetched buffer exists?", !!buf);

  if (!buf) {
    console.log("[scan-check] no buffer -> treating as scanned");
    return true;
  }

  const bufferAvailable = typeof Buffer !== "undefined";
  try {
    console.log(
      "[scan-check] buffer length:",
      bufferAvailable ? (buf as any).length : "Buffer not available in runtime"
    );
    console.log(
      "[scan-check] Buffer.isBuffer:",
      bufferAvailable ? Buffer.isBuffer(buf) : "Buffer not available"
    );

    if (bufferAvailable && (buf as Buffer).length >= 8) {
      try {
        console.log(
          "[scan-check] first8hex:",
          (buf as Buffer).slice(0, 8).toString("hex")
        );
        console.log(
          "[scan-check] first16ascii:",
          (buf as Buffer).slice(0, 16).toString("utf8").replace(/\s+/g, " ")
        );
      } catch (sliceErr) {
        console.log("[scan-check] slice/toString failed:", sliceErr);
      }
    }

    try {
      console.log(
        "[scan-check] pdf-parse resolved path:",
        require.resolve("pdf-parse")
      );
    } catch (resErr) {
      console.log("[scan-check] require.resolve('pdf-parse') failed:", resErr);
    }

    // ✅ loads real node_modules/pdf-parse (bypasses TS/Jest aliases)
    const pdfParse = require("pdf-parse") as (data: any) => Promise<{ text?: string }>;
    console.log("[scan-check] pdf-parse loaded, type:", typeof pdfParse);

    const parsed = await pdfParse(buf);
    console.log(
      "[scan-check] parsed keys:",
      parsed && typeof parsed === "object" ? Object.keys(parsed) : typeof parsed
    );

    const rawText = parsed?.text ?? "";
    console.log("[scan-check] parsed.text length (raw):", rawText.length);
    const text = rawText.replace(/\s+/g, " ").trim();
    console.log(
      "[scan-check] normalized text length:",
      text.length,
      "snippet:",
      text.slice(0, 200)
    );

    return text.length < 50;
  } catch (e: any) {
    console.log("[scan-check] pdf-parse failed:", e && (e.stack || e));
    return true;
  }
}
