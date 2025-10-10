// components/AI/GmailWorkflow/gmailInvoiceAuditNarrative.ts
"use server";

import OpenAI, { toFile } from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { retriever } from "@/server/ai-flows/agents/orchestrating-agent/retrievers";
import { ensurePdfFilename } from "@/app/api/poller/filename";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export type EnrichedEmailPayloadItem = {
  userId: string;
  email: string;
  subject: string;
  body: string;
  pdfs: { filename: string; buffer: Buffer }[]; // per-PDF state will pass a 1-length array
  siteId: string;
  messageId?: string;
};

const auditSchema = z.object({
  summary: z.string(),
  health: z.number().min(0).max(100),
});

export type AuditPdfRow = {
  messageId?: string;
  siteId: string;
  filename: string;
  summary: string;
  health: number;
};

export default async function gmailInvoiceAuditNarrative(
  items: EnrichedEmailPayloadItem[]
): Promise<AuditPdfRow[]> {
  const out: AuditPdfRow[] = [];

  for (const item of items) {
    const siteId = item.siteId || "not_found";

    // (Optional) brief site context to improve judgment signal
    let siteContext = "";
    if (siteId !== "not_found") {
      try {
        const prompt = `Key context for invoice review at siteId=${siteId}. Focus on typical payment terms and known red flags. Keep it concise.`;
        const ctx = await retriever(prompt, siteId);
        siteContext = typeof ctx === "string" ? ctx : JSON.stringify(ctx);
      } catch {
        siteContext = "";
      }
    }

    // ---- PER-PDF: iterate each pdf, upload, then review just that pdf ----
    for (const pdf of item.pdfs ?? []) {
      try {
        // Upload this PDF only
        const safeName = ensurePdfFilename(pdf.filename); // <-- normalize to .pdf
        const f = await toFile(pdf.buffer, safeName, { contentType: "application/pdf" });
        const uploaded = await client.files.create({ file: f, purpose: "user_data" });


         function getTodayDDMMYYYY() {
              const d = new Date();
              const day = String(d.getDate()).padStart(2, '0');
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const year = d.getFullYear();
              return `${day}-${month}-${year}`;
            }

         const today = getTodayDDMMYYYY()


        const instructions =
          `Today is ${today} (format day-month-year)` + 
          "You are a helpful construction invoice reviewer. Speak plainly and briefly. " +
          "If the invoice looks fine, say so and why. If something seems off, explain clearly and suggest next steps. " +
          "Avoid legalese; keep it practical. Assess invoice health from 0–100 (100 = perfect).";

        const checklist =
          `Consider:\n ` +
          "- Are payment terms clear/reasonable? Unusual penalties/discounts?\n" +
          "- Unit prices/quantities typical? Outliers/duplicates?\n" +
          "- Subtotal, VAT, total add up? Currency consistent?\n" +
          "- Vendor/buyer names consistent with expectations?\n" +
          "- Anything to make a PM double-check (dates, PO match, missing details)?\n" +
          "End with a verdict: OK ✅, Needs review ⚠️, or Problem ❌.";

        const content = [
          { type: "input_text", text: instructions },
          { type: "input_text", text: `SiteId: ${siteId}` },
          {
            type: "input_text",
            text: `From: ${item.email}\nSubject: ${item.subject}\n\nEmail body:\n${(item.body || "").slice(0, 8000)}`,
          },
          ...(siteContext ? [{ type: "input_text", text: `Site context:\n${siteContext.slice(0, 8000)}` }] : []),
          { type: "input_file", file_id: uploaded.id }, // <-- just this PDF
          { type: "input_text", text: checklist },
        ];

        const resp = await client.responses.create({
          model: "gpt-4.1",
          temperature: 0.4,
          input: [{ role: "user", content }],
          text: { format: zodTextFormat(auditSchema, "audit") },
        });

        // Coerce to the audit schema we requested
        const text = resp.output_text?.trim() || "{}";
        const parsed = JSON.parse(text) as z.infer<typeof auditSchema>;

        out.push({
          messageId: item.messageId,
          siteId,
          filename: pdf.filename || "invoice.pdf",
          summary: parsed.summary,
          health: parsed.health,
        });
      } catch (e: any) {
        out.push({
          messageId: item.messageId,
          siteId,
          filename: pdf.filename || "invoice.pdf",
          summary:
            "Could not review this invoice right now. Please retry. " +
            (e?.message ? `Details: ${e.message}` : ""),
          health: 0,
        });
      }
    }
  }

  return out;
}
