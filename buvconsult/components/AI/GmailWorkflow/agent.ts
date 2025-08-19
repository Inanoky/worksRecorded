// components/AI/GmailWorkflow/gmailInvoiceAuditNarrative.ts
"use server";

import OpenAI, { toFile } from "openai";
import { retriever } from "@/components/AI/RAG/LanggraphAgentVersion/retrievers";
import {z} from "zod"
import { zodTextFormat } from "openai/helpers/zod";


const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export type EnrichedEmailPayloadItem = {
  userId: string;
  email: string;               // sender
  subject: string;
  body: string;                // text-only best effort
  pdfs: { filename: string; buffer: Buffer }[];
  siteId: string;              // Site.id or "not_found"
  messageId?: string;
};

const auditSchema = z.object({
  summary: z.string(),                       // Human explanation
  health: z.number().min(0).max(100),        // Health % (0–100)
});

async function uploadPdfs(pdfs: { filename: string; buffer: Buffer }[]) {
  const ids: string[] = [];
  for (const pdf of pdfs ?? []) {
    const f = await toFile(pdf.buffer, pdf.filename || "invoice.pdf", {
      contentType: "application/pdf",
    });
    const uploaded = await client.files.create({ file: f, purpose: "user_data" });
    ids.push(uploaded.id);
  }
  return ids;
}

export default async function gmailInvoiceAuditNarrative(
  items: EnrichedEmailPayloadItem[]
): Promise<Array<{
  messageId?: string;
  siteId: string;
  summary: string;  // human-like explanation
}>> {
  const out: Array<{ messageId?: string; siteId: string; summary: string , health: string}> = [];

  for (const item of items) {
    const siteId = item.siteId || "not_found";

    // Optional: short site context via your retriever
    let siteContext = "";
    if (siteId !== "not_found") {
      try {
        const prompt = `Key context for invoice sanity-check at siteId=${siteId}. Focus on usual payment terms, common unit rates, and any known red flags. Keep it concise.`;
        const ctx = await retriever(prompt, siteId);
        siteContext = typeof ctx === "string" ? ctx : JSON.stringify(ctx);
      } catch {
        siteContext = "";
      }
    }

    // Upload PDFs directly to OpenAI
    const fileIds = await uploadPdfs(item.pdfs);

    // Build a natural prompt
    const instructions =
      "You are a helpful construction invoice reviewer. " +
      "Speak plainly and briefly. If the invoice looks fine, say so and why. " +
      "If something seems off, explain it clearly and suggest next steps. " +
      "Avoid legalese; keep it practical." +
      "Assess invoice health, where 100 - perfect healthy invoice, 0 - probably scam need revision";

    const checklist =
      "Consider:\n" +
      "- Are payment terms clear and reasonable? Any unusual penalties/discounts?\n" +
      "- Do unit prices and quantities look typical? Any outliers or duplicates?\n" +
      "- Do subtotal, VAT and total add up? Currency consistent?\n" +
      "- Vendor and buyer names consistent with expectations?\n" +
      "- Anything that would make a PM double-check (dates, mismatched PO, missing details)?\n" +
      "Conclude with a one-line verdict like: OK ✅, Needs review ⚠️, or Problem ❌.";

    const contentBlocks: any[] = [
      { type: "input_text", text: instructions },
      { type: "input_text", text: `SiteId: ${siteId}` },
      { type: "input_text", text: `From: ${item.email}\nSubject: ${item.subject}\n\nEmail body:\n${(item.body || "").slice(0, 8000)}` },
      ...(siteContext ? [{ type: "input_text", text: `Site context:\n${siteContext.slice(0, 8000)}` }] : []),
      ...fileIds.map((id) => ({ type: "input_file", file_id: id })),
      { type: "input_text", text: checklist },
    ];

    try {
      const resp = await client.responses.create({
        model: "gpt-4.1",
        temperature: 0.4,
        input: [{ role: "user", content: contentBlocks }],
        text: { format: zodTextFormat(auditSchema, "audit") },
        
      });

      
      const summary = resp.output_text?.trim() || "No response.";
     console.log(`this is summary ${summary}`)

     const parsedSummary = JSON.parse(summary)
     console.log(`this is health ${parsedSummary.health}`)

    
      out.push({ messageId: item.messageId, siteId, summary: parsedSummary.summary, health: parsedSummary.health });
    } catch (e: any) {
      out.push({
        messageId: item.messageId,
        siteId,
        summary:
          "Could not review this invoice right now. Please retry. " +
          (e?.message ? `Details: ${e.message}` : ""),
      });
    }
  }

  return out;
}
