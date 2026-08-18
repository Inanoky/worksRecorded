import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import type { SupportedReplyLanguage } from "./fastPath";

export const siteDiaryExtractionCheckerModel = "gpt-5.6-terra";
export const siteDiaryExtractionCheckerReasoningEffort = "medium" as const;

export const siteDiaryExtractionCheckerSchema = z.object({
  verdict: z.enum(["accept", "retry"]),
  reason: z.string().max(500),
  badSplitSignals: z.array(z.string().max(160)).max(8),
  repairInstructions: z.string().max(1000),
  expectedRecordCount: z.number().int().min(1).max(25).nullable().optional(),
});

export type SiteDiaryExtractionCheckerResult = z.infer<typeof siteDiaryExtractionCheckerSchema>;

type SiteDiaryExtractionCheckerRow = Record<string, unknown>;

function hasValue(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

function compact(value: unknown, maxLength = 500) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

export function serializeRowsForSiteDiaryChecker(rows: SiteDiaryExtractionCheckerRow[]) {
  return rows.map((row, index) => {
    const fields = [
      ["Works", row.Works],
      ["Location", row.Location],
      ["Comments", row.Comments],
      ["Amounts", row.Amounts],
      ["Units", row.Units],
      ["WorkersInvolved", row.WorkersInvolved],
      ["TimeInvolved", row.TimeInvolved],
    ]
      .filter(([, value]) => hasValue(value))
      .map(([key, value]) => `${key}: ${compact(value, 180)}`);

    return `Record ${index + 1}: ${fields.length ? fields.join("; ") : "(empty)"}`;
  }).join("\n");
}

export function buildSiteDiaryExtractionCheckerMessages(args: {
  originalMessage: string;
  rows: SiteDiaryExtractionCheckerRow[];
  language: SupportedReplyLanguage;
}) {
  return [
    new SystemMessage(
      `You are a strict construction site diary extraction checker.
Judge whether the proposed rows represent real separate diary events/jobs from the original WhatsApp message.
Return verdict=accept when the row count and split are safe enough to save automatically.
Return verdict=retry when one real job was split into artificial rows, when machinery/tools/operators/sub-actions were turned into separate jobs, or when shared workers/hours/quantity were split without source evidence.
Do not reject merely because there are many rows. Full-day reports can legitimately create many rows when each row has distinct source evidence.
A row can be a site-diary-relevant note, weather entry, material delivery, machinery note, or work item when it is a real diary event.
Do not judge enum/category wording harshly unless it caused a wrong split.
If retry is needed, write concrete repairInstructions for the extractor. The instruction must say which rows should be merged, dropped, or preserved, and why.
Use language=${args.language} for reason and repairInstructions when practical.`,
    ),
    new HumanMessage(
      `Original WhatsApp message:
${args.originalMessage}

Proposed rows:
${serializeRowsForSiteDiaryChecker(args.rows)}`,
    ),
  ];
}

export async function invokeSiteDiaryExtractionChecker(args: {
  originalMessage: string;
  rows: SiteDiaryExtractionCheckerRow[];
  language: SupportedReplyLanguage;
  runnableConfig?: Record<string, unknown>;
}) {
  const llm = new ChatOpenAI({
    model: siteDiaryExtractionCheckerModel,
    reasoning: { effort: siteDiaryExtractionCheckerReasoningEffort },
  });
  const structured = llm.withStructuredOutput(siteDiaryExtractionCheckerSchema, { includeRaw: true }) as any;
  const envelope = await structured.invoke(
    buildSiteDiaryExtractionCheckerMessages(args),
    args.runnableConfig,
  );
  return {
    parsed: (envelope?.parsed ?? envelope) as SiteDiaryExtractionCheckerResult,
    raw: envelope?.raw ?? null,
  };
}
