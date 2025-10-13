// components/AI/GmailWorkflow/siteIdCheck.ts
"use server";

import OpenAI, { toFile } from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { prisma } from "@/lib/utils/db";
import { ensurePdfFilename } from "@/app/api/poller/filename";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export type EmailPayloadItem = {
  userId: string;
  email: string;
  subject: string;
  body: string;
  pdfs: { filename: string; buffer: Buffer }[];
  messageId?: string;            // <-- carry through
};

export type EnrichedEmailPayloadItem = EmailPayloadItem & {
  siteId: string;                // Site.id or "not_found"
};

const matchSchema = z.object({
  result: z.object({
    siteId: z.string(),          // one of candidate IDs or "not_found"
    confidence: z.number().min(0).max(1),
    evidence: z.string().nullable(),
  }),
});

export default async function siteIdCheck(
  items: EmailPayloadItem[]
): Promise<EnrichedEmailPayloadItem[]> {
  const enriched: EnrichedEmailPayloadItem[] = [];

  for (const item of items) {
    try {
      // 1) Candidate sites for this user
      const sites = await prisma.site.findMany({
        where: { userId: item.userId },
        select: { id: true, name: true },
      });

      if (sites.length === 0) {
        enriched.push({ ...item, siteId: "not_found" });
        continue;
      }

      // 2) Upload provided PDFs (in per-PDF flow, this will be exactly one)
      // 2) Upload PDFs to OpenAI (purpose: user_data)
        const uploadedIds: string[] = [];
        for (const pdf of item.pdfs ?? []) {
          const safeName = ensurePdfFilename(pdf.filename); // <-- normalize to .pdf
          const f = await toFile(pdf.buffer, safeName, { contentType: "application/pdf" });
          const uploaded = await client.files.create({ file: f, purpose: "user_data" });
          uploadedIds.push(uploaded.id);
        }


      // 3) Ask GPT to pick a site
      const candidates = sites.map((s) => ({ id: s.id, name: s.name }));
      const content = [
        {
          type: "input_text",
           text:
            "You will receive: a candidate list of sites (id,name), email text, and PDFs. " +
            'Pick the matching siteId from bodys/subject ' +
            `If not found - check PDF and see if project name can be found there` +
            `if not found in body/subject and PDF - return or "not_found"`
        },
        { type: "input_text", text: "Candidates:\n" + JSON.stringify(candidates, null, 2) },
        {
          type: "input_text",
          text: `Email:\nFrom: ${item.email}\nSubject: ${item.subject}\n\nBody:\n${(item.body || "").slice(0, 8000)}`,
        },
        ...uploadedIds.map((id) => ({ type: "input_file", file_id: id })),
        {
          type: "input_text",
          text:
            
            "Return strictly JSON per schema.",
        },
      ];

      const resp = await client.responses.create({
        model: "gpt-4.1",
        input: [{ role: "user", content }],
        text: { format: zodTextFormat(matchSchema, "event") },
      });

      let siteId = "not_found";
      try {
        const parsed = JSON.parse(resp.output_text || "{}") as z.infer<typeof matchSchema>;
        const proposed = parsed?.result?.siteId || "not_found";
        const valid = proposed === "not_found" || candidates.some((c) => c.id === proposed);
        siteId = valid ? proposed : "not_found";
      } catch {
        siteId = "not_found";
      }

      enriched.push({ ...item, siteId });
    } catch (err) {
      console.error("siteIdCheck error:", err);
      enriched.push({ ...item, siteId: "not_found" });
    }
  }

  return enriched;
}
