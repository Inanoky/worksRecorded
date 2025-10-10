// utils/filename.ts (or inline in each file)
const PDF_EXT_RE = /\.pdf$/i;

export function ensurePdfFilename(name?: string) {
  const base = (name || "invoice.pdf").split(/[\\/]/).pop() || "invoice.pdf";
  if (!PDF_EXT_RE.test(base)) {
    // replace any existing extension or append .pdf
    const dot = base.lastIndexOf(".");
    const stem = dot >= 0 ? base.slice(0, dot) : base;
    return `${stem}.pdf`;
  }
  // force lower-case extension
  return base.replace(/\.pdf$/i, ".pdf");
}
