// app/utils/gptResponse.ts
"use server";

import OpenAI, { toFile } from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { prisma } from "@/app/utils/db";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ---- Input/Output types ----
export type EmailPayloadItem = {
  userId: string;
  email: string; // sender address
  subject: string;
  body: string;  // text-only best effort
  pdfs: { filename: string; buffer: Buffer }[];
};

export type EnrichedEmailPayloadItem = EmailPayloadItem & {
  siteId: string; // real Site.id or "not_found"
};

// ---- GPT output schema ----
const matchSchema = z.object({
  result: z.object({
    siteId: z.string(),                  // one of candidate IDs or "not_found"
    confidence: z.number().min(0).max(1),
    evidence: z.string().nullable(),
  }),
});

/**
 * Pure AI module: for each item, fetch user's Sites, upload PDFs, ask GPT
 * to decide which Site (by id) matches based on subject/body/PDF content.
 */
export default async function siteIdCheck(
  items: EmailPayloadItem[]
): Promise<EnrichedEmailPayloadItem[]> {
  const enriched: EnrichedEmailPayloadItem[] = [];

  for (const item of items) {
    try {
      // 1) Get candidate sites for this user
      const sites = await prisma.site.findMany({
        where: { userId: item.userId },
        select: { id: true, name: true },
      });

      if (sites.length === 0) {
        enriched.push({ ...item, siteId: "not_found" });
        continue;
      }

      // 2) Upload PDFs to OpenAI (purpose: user_data)
      const uploadedIds: string[] = [];
      for (const pdf of item.pdfs ?? []) {
        const f = await toFile(pdf.buffer, pdf.filename || "invoice.pdf", {
          contentType: "application/pdf",
        });
        const uploaded = await client.files.create({ file: f, purpose: "user_data" });
        uploadedIds.push(uploaded.id);
      }

      // 3) Prepare GPT prompt (candidates + email text + PDFs)
      const candidates = sites.map((s) => ({ id: s.id, name: s.name }));

      const inputContent: any[] = [
        {
          type: "input_text",
          text:
            "You will receive: (a) a candidate list of site names with IDs, " +
            "(b) the email's sender/subject/body text, and (c) one or more PDFs (typically invoices). " +
            "Task: Decide which candidate Site this material belongs to, or return \"not_found\" if none clearly match.",
        },
        {
          type: "input_text",
          text: "Candidates (array of {id, name}):\n" + JSON.stringify(candidates, null, 2),
        },
        {
          type: "input_text",
          text:
            `Email context:\nFrom: ${item.email}\nSubject: ${item.subject}\n\n` +
            `Body (text-only):\n${(item.body || "").slice(0, 8000)}`,
        },
        // Attach PDFs
        ...uploadedIds.map((id) => ({ type: "input_file", file_id: id })),
        {
          type: "input_text",
          text:
            "Decision rules:\n" +
            "- If an exact or near-exact project/site name from the candidates appears in the email text or PDFs, return that candidate's id.\n" +
            "- Prefer explicit matches; avoid guessing; be conservative.\n" +
            "- If nothing clearly matches, return siteId = \"not_found\".\n" +
            "- Include a numeric confidence (0..1) and brief evidence.\n" +
            "Return strictly the JSON matching the required schema.",
        },
      ];

      const resp = await client.responses.create({
        model: "gpt-4.1",
        input: [{ role: "user", content: inputContent }],
        text: { format: zodTextFormat(matchSchema, "event") },
      });

      // 4) Validate output (guard-rails)
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
      console.error("gptResponse item error:", err);
      enriched.push({ ...item, siteId: "not_found" });
    }
  }

  return enriched;
}
