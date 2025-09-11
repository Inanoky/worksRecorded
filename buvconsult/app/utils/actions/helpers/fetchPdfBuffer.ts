// app/utils/actions/helpers/fetchPdfBuffer.ts
import "server-only";

export async function fetchPdfBuffer(url: string): Promise<Buffer | null> {
  console.log("[fetchPdfBuffer] start - url:", url);
  try {
    const res = await fetch(url);
    console.log(
      "[fetchPdfBuffer] response status:",
      res.status,
      "content-type:",
      res.headers.get("content-type"),
      "content-length(header):",
      res.headers.get("content-length")
    );

    if (!res.ok) {
      console.log("[fetchPdfBuffer] non-ok response ->", res.status);
      return null;
    }

    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);

    console.log("[fetchPdfBuffer] buffer length:", buf.length);
    if (buf.length >= 8) {
      try {
        console.log("[fetchPdfBuffer] first8hex:", buf.slice(0, 8).toString("hex"));
        console.log(
          "[fetchPdfBuffer] first16ascii:",
          buf.slice(0, 16).toString("utf8").replace(/\s+/g, " ")
        );
      } catch (sliceErr) {
        console.log("[fetchPdfBuffer] slice/toString failed:", sliceErr);
      }
    }

    return buf;
  } catch (err) {
    console.log("[fetchPdfBuffer] fetch failed:", err && (err as any).stack ? (err as any).stack : err);
    return null;
  }
}
