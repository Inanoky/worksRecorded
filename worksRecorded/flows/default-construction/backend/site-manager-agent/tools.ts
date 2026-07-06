import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { ToolNode } from "@langchain/langgraph/prebuilt"
import { GraphState } from "@/server/ai-flows/agents/shared-between-agents/state";
import { ChatOpenAI } from "@langchain/openai";

import { saveSiteDiaryRecord } from "@/server/actions/site-diary-actions";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { systemPromptSaveToDatabaseFunction } from "./prompts";
import defaultConfig from "@/components/sitediary/configs/defaultConfig.json"

import { getConfig } from "@/server/actions/site-diary-actions";
import { buildZodSchemaFromConfig, mapToDbFields } from "./AIschemas";
import { recordStructuredSaveTrace } from "./structuredSaveTrace";
import { getWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";
import { getSiteManagerAgentRunContext } from "./runContext";
import {
  buildAiRunContext,
  summarizeForTrace,
} from "@/server/ai-flows/ai-run-context";
import { formatSiteDiarySaveToolResult } from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/siteDiaryToolResult";
import { getSiteManagerToolContext } from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/siteDiaryToolContext";
import {
  getBisConnectionStatus,
  readBisMaterialRecords,
  readSiteDiaryBisStatuses,
} from "@/server/ai-flows/agents/bis-support-agent/tools";

function currentDiaryDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Riga",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.day}-${values.month}-${values.year}`;
}

export const allowedUnits = [
  "m", "m2", "m3", "tn", "kg",
  "pcs", "package", "project",
  "hour", "set", "minute", "lifts",
] as const;

export const siteDiaryToDatabaseTool = new DynamicStructuredTool({
  name: "save_to_database",
  description:
    "Save one construction site diary log to the database. Use this only for real site diary work or notes that should become site diary records.",

  schema: z.object({
    question: z
      .string()
      .describe("The original site diary text to parse from the user's message."),
    date: z
      .string()
      .optional()
      .describe("The explicit diary date from the user, usually dd-mm-yyyy. Omit it when no date was specified."),
  }),

  async func({ question, date: requestedDate }) {
    const toolContext = getSiteManagerToolContext();
    if (!toolContext) {
      return "Failed to save site diary entry. Reason: Trusted site diary context is unavailable";
    }

    const { userId, siteId, originalUserComment } = toolContext;
    const date = requestedDate ?? currentDiaryDate();
    const whatsappSourceContext = getWhatsappSourceContext();
    const runContext = getSiteManagerAgentRunContext();
    const aiContext = buildAiRunContext({
      flow: "structured-site-diary-save",
      threadId: `structured-site-diary-save:${siteId}:${userId}`,
      siteId,
      userId,
      channel: "tool",
      model: "gpt-5.4",
      metadata: {
        date,
        hasOriginalAudioUrl: Boolean(whatsappSourceContext.originalAudioUrl),
        originalUserCommentPreview: summarizeForTrace(originalUserComment),
        ...(runContext?.traceMetadata ?? {}),
      },
      tags: runContext?.traceTags,
    });

    console.log("▶️ TOOL START");
    console.log("Input:", { question, userId, siteId, date });
    console.log("[originalAudioUrl][siteManagerTool] received app context", {
      hasOriginalAudioUrl: Boolean(whatsappSourceContext.originalAudioUrl),
      userId,
      siteId,
    });

    const map = await getConfig(siteId);
    const mapToUse = map ? map : defaultConfig;

    console.log("✅ Config loaded:", map ? "DB config" : "Default config");

    const {
      schema: SiteDiaryRecordSchema,
      fieldMap,
      dropdownValueMaps,
    } =
      buildZodSchemaFromConfig(mapToUse);

    const SiteDiaryRecordsSchema = z.object({
      records: z.array(SiteDiaryRecordSchema),
    });

    console.log("✅ Zod schemas built");

    const client = map?.AIpromptToUse?.Client;

    const llm = new ChatOpenAI({
      model: "gpt-5.4",
      reasoning: { effort: "low" },
    });

    const structuredLlm = llm.withStructuredOutput(
      SiteDiaryRecordsSchema
    );

    console.log("✅ LLM initialized");
    console.log("🤖 Calling LLM...");

    const response = await structuredLlm.invoke(
      [
        new HumanMessage(`${question} Date is : ${date}`),
        new SystemMessage(
          `${await systemPromptSaveToDatabaseFunction(userId, client)}\n` +
          `today is : ${date}\n` +
          `${siteId}`
        ),
      ],
      aiContext.runnableConfig,
    );

    console.log("📥 LLM response:");
    console.log(JSON.stringify(response, null, 2));

    const rows = response.records.map((r, i) => {
      const mapped = mapToDbFields(r, fieldMap, dropdownValueMaps);

      console.log(`🧩 Mapped row ${i + 1}:`, mapped);

      return mapped;
    });

    console.log(`✅ Total rows prepared: ${rows.length}`);
    console.log("💾 Saving to database...");

    const result = await saveSiteDiaryRecord({
      rows,
      userId,
      siteId,
      originalUserComment,
      evalMetadata: runContext?.evalRecordMetadata,
    });

    console.log("✅ Save result:", result);

    recordStructuredSaveTrace({
      siteId,
      userId,
      date,
      originalUserComment,
      rawRecords: response.records,
      mappedRows: rows,
      normalizedInsertRows: result?.normalizedInsertRows ?? [],
      persistedRecords: result?.records ?? [],
    });

    const toolResultMessage = formatSiteDiarySaveToolResult(result, rows.length);
    if (!result?.ok) return toolResultMessage;

    console.log("🏁 TOOL END");

    return toolResultMessage;
  },
});

function serializeBisResult(value: unknown) {
  return JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item);
}

export const bisConnectionStatusTool = new DynamicStructuredTool({
  name: "get_bis_connection_status",
  description:
    "Read the trusted user's local BIS connection and active-project case configuration. Use for BIS connection, setup, eligibility, or submission guidance. This does not contact BIS and cannot change data.",
  schema: z.object({}),
  async func() {
    const context = getSiteManagerToolContext();
    if (!context) {
      return "BIS status could not be verified because trusted site-manager context is unavailable.";
    }
    try {
      const result = await getBisConnectionStatus(
        { siteId: context.siteId, userId: context.userId },
        { connectionOverride: getSiteManagerAgentRunContext()?.bisConnectionOverride },
      );
      return serializeBisResult(result);
    } catch {
      return serializeBisResult({ error: "BIS connection status could not be verified." });
    }
  },
});

export const bisMaterialRecordsTool = new DynamicStructuredTool({
  name: "read_bis_material_records",
  description: "Read locally stored BIS material records for the trusted active project. This is read-only.",
  schema: z.object({
    search: z.string().trim().max(120).optional().describe("Optional material, category, invoice, or cost-code search text."),
    limit: z.number().int().min(1).max(20).default(10),
  }),
  async func({ search, limit }) {
    const context = getSiteManagerToolContext();
    if (!context) return "BIS materials could not be read because trusted site-manager context is unavailable.";
    try {
      return serializeBisResult(await readBisMaterialRecords(
        { siteId: context.siteId, userId: context.userId },
        { search, limit },
      ));
    } catch {
      return serializeBisResult({ error: "BIS material records could not be read." });
    }
  },
});

export const siteDiaryBisStatusesTool = new DynamicStructuredTool({
  name: "read_site_diary_bis_statuses",
  description: "Read local BIS submission identifiers and statuses for site diary records in the trusted active project. This is read-only.",
  schema: z.object({
    submission: z.enum(["all", "sent", "not-sent"]).default("all"),
    search: z.string().trim().max(120).optional().describe("Optional work, location, or comment search text."),
    limit: z.number().int().min(1).max(20).default(10),
  }),
  async func({ submission, search, limit }) {
    const context = getSiteManagerToolContext();
    if (!context) return "BIS diary statuses could not be read because trusted site-manager context is unavailable.";
    try {
      return serializeBisResult(await readSiteDiaryBisStatuses(
        { siteId: context.siteId, userId: context.userId },
        { submission, search, limit },
      ));
    } catch {
      return serializeBisResult({ error: "Site diary BIS statuses could not be read." });
    }
  },
});

export const tools = [
  siteDiaryToDatabaseTool,
  bisConnectionStatusTool,
  bisMaterialRecordsTool,
  siteDiaryBisStatusesTool,
]

export const toolNode = new ToolNode<typeof GraphState.State>(tools)
