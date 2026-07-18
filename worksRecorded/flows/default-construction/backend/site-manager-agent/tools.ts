import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { ToolNode } from "@langchain/langgraph/prebuilt"
import { GraphState } from "@/server/ai-flows/agents/shared-between-agents/state";
import { ChatOpenAI } from "@langchain/openai";

import {
  archiveAndReplaceSiteDiaryBatch,
  getSiteDiaryCorrectionTarget,
  saveSiteDiaryRecord,
  startSiteDiaryCorrection,
} from "@/server/actions/site-diary-actions";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { systemPromptSaveToDatabaseFunction } from "./prompts";
import defaultConfig from "@/components/sitediary/configs/defaultConfig.json"

import { getConfig } from "@/server/actions/site-diary-actions";
import { buildZodSchemaFromConfig, mapToDbFields } from "./AIschemas";
import { recordStructuredSaveTrace } from "./structuredSaveTrace";
import { getWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";
import {
  fastPathTraceConfig,
  getSiteManagerAgentRunContext,
  recordSiteManagerModelCall,
  recordSiteManagerTiming,
  recordSiteManagerToolCall,
  type FastPathTraceMetadata,
} from "./runContext";
import {
  detectReplyLanguage,
  serializeCorrectionToolResult,
  type SiteDiaryCorrectionResult,
  type SupportedReplyLanguage,
} from "./fastPath";
import {
  buildAiRunContext,
  summarizeForTrace,
} from "@/server/ai-flows/ai-run-context";
import { formatSiteDiarySaveToolResult } from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/siteDiaryToolResult";
import {
  getSiteManagerToolContext,
  setSiteManagerSavedConfirmationRecords,
  type SiteDiaryConfirmationRecord,
} from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/siteDiaryToolContext";
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

const structuredSiteDiaryModel = "gpt-5.6-terra";
const structuredSiteDiaryReasoningEffort = "medium" as const;

type StructuredSaveResult = {
  action: "save_new_report" | "correct_existing_report" | "fallback" | "clarify";
  correctionMode: "not_applicable" | "intent_only" | "supplied";
  language: SupportedReplyLanguage;
  content: string;
  ok: boolean;
  count: number;
  records?: SiteDiaryConfirmationRecord[];
  rows?: Record<string, any>[];
  intentReason?: string;
  intentConfidence?: number;
};

function usageFromMessage(message: any) {
  const usage = message?.usage_metadata ?? message?.response_metadata?.tokenUsage ?? {};
  const inputTokens = Number(usage.input_tokens ?? usage.promptTokens ?? 0);
  const outputTokens = Number(usage.output_tokens ?? usage.completionTokens ?? 0);
  return {
    inputTokens,
    outputTokens,
    totalTokens: Number(usage.total_tokens ?? usage.totalTokens ?? inputTokens + outputTokens),
  };
}

function normalizeUnknownNumericFields(
  row: Record<string, any>,
  source: string,
) {
  const normalized = { ...row };
  const hasExplicitZeroAmount = /(?:^|\s)0(?:[.,]0+)?\s*(?:m2|m3|m²|m³|m|kg|tn|pcs|gab|gabali|pieces?|units?)\b/iu.test(source);
  if (normalized.Amounts === 0 && !hasExplicitZeroAmount) normalized.Amounts = null;
  return normalized;
}

function toConfirmationRecords(records: unknown): SiteDiaryConfirmationRecord[] {
  if (!Array.isArray(records)) return [];
  return records.map((value) => {
    const record = value && typeof value === "object"
      ? value as Record<string, unknown>
      : {};
    return {
      Date: record.Date instanceof Date || typeof record.Date === "string" ? record.Date : null,
      Location: typeof record.Location === "string" ? record.Location : null,
      Works: typeof record.Works === "string" ? record.Works : null,
      Comments: typeof record.Comments === "string" ? record.Comments : null,
      Units: typeof record.Units === "string" ? record.Units : null,
      Amounts: typeof record.Amounts === "number" ? record.Amounts : null,
      WorkersInvolved: typeof record.WorkersInvolved === "number" ? record.WorkersInvolved : null,
      TimeInvolved: typeof record.TimeInvolved === "number" ? record.TimeInvolved : null,
    };
  });
}

export async function extractAndSaveSiteDiary(args: {
  question: string;
  requestedDate?: string;
  allowFallback?: boolean;
  persist?: boolean;
  fastPathTrace?: FastPathTraceMetadata;
  intentContext?: { hasReplyContext: boolean; hasPendingCorrection: boolean };
}): Promise<StructuredSaveResult> {
  const toolStarted = Date.now();
  const toolContext = getSiteManagerToolContext();
  if (!toolContext) {
    return {
      action: "save_new_report",
      correctionMode: "not_applicable",
      language: detectReplyLanguage(args.question),
      content: "Failed to save site diary entry. Reason: Trusted site diary context is unavailable",
      ok: false,
      count: 0,
    };
  }

  const { userId, siteId, originalUserComment } = toolContext;
  setSiteManagerSavedConfirmationRecords([]);
  const date = args.requestedDate ?? currentDiaryDate();
  const whatsappSourceContext = getWhatsappSourceContext();
  const runContext = getSiteManagerAgentRunContext();
  const runMetrics = runContext?.metrics;
  const structuredTrace = fastPathTraceConfig(args.fastPathTrace ?? runContext?.fastPathTrace ?? {
    fastPathMode: runMetrics?.fastPathMode ?? "off",
    fastPathCandidate: false,
    executionPath: "legacy-agent",
    fastPathAttempted: false,
    fastPathOutcome: "skipped",
    fallbackReason: "ineligible",
  });
  const aiContext = buildAiRunContext({
    flow: "structured-site-diary-save",
    threadId: `structured-site-diary-save:${siteId}:${userId}`,
    siteId,
    userId,
    channel: "tool",
    model: structuredSiteDiaryModel,
    metadata: {
      date,
      hasOriginalAudioUrl: Boolean(whatsappSourceContext.originalAudioUrl),
      whatsappMessageId: whatsappSourceContext.messageId ?? null,
      originalUserCommentPreview: summarizeForTrace(originalUserComment),
      fastPath: Boolean(args.allowFallback),
      ...(runContext?.traceMetadata ?? {}),
      ...structuredTrace.metadata,
    },
    tags: [...(runContext?.traceTags ?? []), ...structuredTrace.tags],
  });

  const updateTraceOutcome = (
    fastPathOutcome: FastPathTraceMetadata["fastPathOutcome"],
    fallbackReason?: FastPathTraceMetadata["fallbackReason"],
  ) => {
    Object.assign(aiContext.runnableConfig.metadata, { fastPathOutcome });
    if (fallbackReason) {
      Object.assign(aiContext.runnableConfig.metadata, { fallbackReason });
    } else {
      delete aiContext.runnableConfig.metadata.fallbackReason;
    }
  };

  const contextStarted = Date.now();
  const map = await getConfig(siteId);
  const mapObject = map && typeof map === "object" && !Array.isArray(map)
    ? map as Record<string, any>
    : null;
  const mapToUse = mapObject ?? defaultConfig;
  const systemPrompt = await systemPromptSaveToDatabaseFunction(
    userId,
    mapObject?.AIpromptToUse?.Client,
  );
  recordSiteManagerTiming("structuredContextMs", Date.now() - contextStarted);

  const { schema: recordSchema, fieldMap, dropdownValueMaps } = buildZodSchemaFromConfig(mapToUse as any);
  const baseSchema = z.object({ records: z.array(recordSchema) });
  const responseSchema = args.allowFallback
    ? z.object({
        action: z.enum(["save_new_report", "correct_existing_report", "fallback", "clarify"]),
        correctionMode: z.enum(["not_applicable", "intent_only", "supplied"]),
        language: z.enum(["lv", "en", "ru"]),
        records: z.array(recordSchema),
        intentReason: z.string().max(240),
        intentConfidence: z.number().min(0).max(1),
      })
    : baseSchema;

  const llm = new ChatOpenAI({
    model: structuredSiteDiaryModel,
    reasoning: { effort: structuredSiteDiaryReasoningEffort },
  });
  const structuredLlm = llm.withStructuredOutput(responseSchema, { includeRaw: true }) as any;
  const extractionStarted = Date.now();
  let envelope: any;
  try {
    envelope = await structuredLlm.invoke(
      [
        new HumanMessage(`${args.question} Date is : ${date}`),
        new SystemMessage(
          `${systemPrompt}\ntoday is : ${date}\n${siteId}` +
            (args.allowFallback
              ? `\nClassify the complete message, never isolated keywords. Set action=save_new_report only for a new site diary report. Set action=correct_existing_report when the user is asking to change a previous report. Set action=clarify when save-versus-correction intent is genuinely ambiguous. Set action=fallback for questions, greetings, BIS requests, project commands, or other conversation. Return no records unless action=save_new_report. Set correctionMode=not_applicable unless action=correct_existing_report. For correction intent, set correctionMode=intent_only when the user only asks to correct/change the earlier record but does not provide the new facts; set correctionMode=supplied when the message contains the requested change or trusted pending-correction state makes this message the supplied change. Latvian completed-work statements such as "Šodien salabojām durvis" are new reports, while imperatives referring to an earlier record such as "Salabo iepriekšējo ierakstu" are corrections. Trusted state: replyContext=${Boolean(args.intentContext?.hasReplyContext)}, pendingCorrection=${Boolean(args.intentContext?.hasPendingCorrection)}. Reply context and a pending correction are strong evidence, but still interpret the full message.`
              : ""),
        ),
      ],
      aiContext.runnableConfig,
    );
  } catch (error) {
    updateTraceOutcome("error", "extraction-error");
    const durationMs = Date.now() - extractionStarted;
    recordSiteManagerTiming("structuredExtractionMs", durationMs);
    recordSiteManagerModelCall({
      purpose: args.allowFallback ? "fast-path-extraction" : "structured-extraction",
      model: structuredSiteDiaryModel,
      actualModel: null,
      durationMs,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    });
    if (args.allowFallback) {
      return {
        action: "fallback",
        correctionMode: "not_applicable",
        language: detectReplyLanguage(args.question),
        content: "",
        ok: false,
        count: 0,
      };
    }
    throw error;
  }
  const extractionDurationMs = Date.now() - extractionStarted;
  const response = envelope?.parsed ?? envelope;
  const rawMessage = envelope?.raw ?? null;
  const usage = usageFromMessage(rawMessage);
  recordSiteManagerTiming("structuredExtractionMs", extractionDurationMs);
  recordSiteManagerModelCall({
    purpose: args.allowFallback ? "fast-path-extraction" : "structured-extraction",
    model: structuredSiteDiaryModel,
    actualModel: rawMessage?.response_metadata?.model_name ?? null,
    durationMs: extractionDurationMs,
    ...usage,
  });

  const language = args.allowFallback
    ? (response.language as SupportedReplyLanguage | undefined) ?? detectReplyLanguage(args.question)
    : detectReplyLanguage(args.question);
  if (args.allowFallback) {
    Object.assign(aiContext.runnableConfig.metadata, {
      classifiedIntent: response.action ?? "fallback",
      correctionMode: response.correctionMode ?? "not_applicable",
      intentConfidence: response.intentConfidence ?? null,
      intentReason: response.intentReason ?? null,
    });
  }
  if (args.allowFallback && response.action !== "save_new_report") {
    if (response.action === "correct_existing_report") {
      updateTraceOutcome("correction");
    } else if (response.action === "clarify") {
      updateTraceOutcome("clarify");
    } else {
      updateTraceOutcome("fallback", "model-fallback");
    }
    recordSiteManagerToolCall({ name: "site_diary_intent_classifier", durationMs: Date.now() - toolStarted, ok: true });
    return {
      action: response.action ?? "fallback",
      correctionMode: response.correctionMode ?? (response.action === "correct_existing_report" ? "supplied" : "not_applicable"),
      language,
      content: "",
      ok: true,
      count: 0,
      intentReason: response.intentReason,
      intentConfidence: response.intentConfidence,
    };
  }

  const rawRecords = Array.isArray(response.records) ? response.records : [];
  if (!rawRecords.length) {
    if (args.allowFallback) updateTraceOutcome("fallback", "no-records");
    const content = "Failed to save site diary entry. Reason: No records to insert";
    recordSiteManagerToolCall({ name: "save_to_database", durationMs: Date.now() - toolStarted, ok: false });
    return {
      action: args.allowFallback ? "fallback" : "save_new_report",
      correctionMode: "not_applicable",
      language,
      content,
      ok: false,
      count: 0,
    };
  }

  const rows = rawRecords.map((record: Record<string, unknown>) =>
    normalizeUnknownNumericFields(
      mapToDbFields(record, fieldMap, dropdownValueMaps),
      args.question,
    ));
  if (args.persist === false) {
    updateTraceOutcome("save");
    recordSiteManagerToolCall({ name: "shadow_save_to_database", durationMs: Date.now() - toolStarted, ok: true });
    return { action: "save_new_report", correctionMode: "not_applicable", language, content: "", ok: true, count: rows.length, rows };
  }
  const persistenceStarted = Date.now();
  let result;
  try {
    result = await saveSiteDiaryRecord({
      rows,
      userId,
      siteId,
      originalUserComment,
      evalMetadata: runContext?.evalRecordMetadata,
    });
  } catch (error) {
    updateTraceOutcome("error");
    const message = error instanceof Error ? error.message : "Database unavailable";
    recordSiteManagerTiming("persistenceMs", Date.now() - persistenceStarted);
    recordSiteManagerToolCall({ name: "save_to_database", durationMs: Date.now() - toolStarted, ok: false });
    return {
      action: "save_new_report",
      correctionMode: "not_applicable",
      language,
      content: `Failed to save site diary entry. Reason: ${message}`,
      ok: false,
      count: 0,
    };
  }
  recordSiteManagerTiming("persistenceMs", Date.now() - persistenceStarted);

  recordStructuredSaveTrace({
    siteId,
    userId,
    date,
    originalUserComment,
    rawRecords,
    mappedRows: rows,
    normalizedInsertRows: result?.normalizedInsertRows ?? [],
    persistedRecords: result?.records ?? [],
  });

  const content = formatSiteDiarySaveToolResult(result, rows.length);
  const ok = Boolean(result?.ok);
  updateTraceOutcome(ok ? "save" : "error");
  const count = result?.count ?? rows.length;
  const confirmationRecords = ok ? toConfirmationRecords(result?.records) : [];
  setSiteManagerSavedConfirmationRecords(confirmationRecords);
  recordSiteManagerToolCall({ name: "save_to_database", durationMs: Date.now() - toolStarted, ok });
  return { action: "save_new_report", correctionMode: "not_applicable", language, content, ok, count, records: confirmationRecords, rows };
}

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
    return (await extractAndSaveSiteDiary({ question, requestedDate })).content;
  },
});

function correctionStatusFromReason(reason: string): SiteDiaryCorrectionResult["status"] {
  if (reason === "bis-linked") return "blocked_bis";
  if (reason === "no-eligible-batch") return "no_eligible_batch";
  if (reason === "no-records") return "needs_clarification";
  return "failed";
}

function correctionResult(args: Omit<SiteDiaryCorrectionResult, "kind">): SiteDiaryCorrectionResult {
  return { kind: "site_diary_correction", ...args };
}

export async function startSiteDiaryCorrectionOperation(args: {
  language: SupportedReplyLanguage;
}): Promise<SiteDiaryCorrectionResult> {
  const started = Date.now();
  const context = getSiteManagerToolContext();
  const source = getWhatsappSourceContext();
  if (!context || !source.messageId) {
    recordSiteManagerToolCall({ name: "start_site_diary_correction", durationMs: Date.now() - started, ok: false });
    return correctionResult({
      status: "failed",
      language: args.language,
      message: "Trusted message context is unavailable",
    });
  }
  try {
    const result = await startSiteDiaryCorrection({
      siteId: context.siteId,
      userId: context.userId,
      messageId: source.messageId,
      replyToMessageId: source.replyToMessageId,
    });
    if (!result.ok) {
      recordSiteManagerToolCall({ name: "start_site_diary_correction", durationMs: Date.now() - started, ok: false });
      return correctionResult({
        status: correctionStatusFromReason(result.reason),
        language: args.language,
      });
    }
    recordSiteManagerToolCall({ name: "start_site_diary_correction", durationMs: Date.now() - started, ok: true });
    return correctionResult({ status: "pending", language: args.language });
  } catch (error) {
    recordSiteManagerToolCall({ name: "start_site_diary_correction", durationMs: Date.now() - started, ok: false });
    return correctionResult({
      status: "failed",
      language: args.language,
      message: error instanceof Error ? error.message : "Unknown correction error",
    });
  }
}

export async function replaceLastSiteDiaryBatchOperation(args: {
  correction: string;
  language: SupportedReplyLanguage;
}): Promise<SiteDiaryCorrectionResult> {
  const started = Date.now();
  const context = getSiteManagerToolContext();
  const source = getWhatsappSourceContext();
  const runContext = getSiteManagerAgentRunContext();
  if (!context || !source.messageId) {
    recordSiteManagerToolCall({ name: "replace_last_site_diary_batch", durationMs: Date.now() - started, ok: false });
    return correctionResult({
      status: "failed",
      language: args.language,
      message: "Trusted message context is unavailable",
    });
  }

  try {
    const target = await getSiteDiaryCorrectionTarget({
      siteId: context.siteId,
      userId: context.userId,
      replyToMessageId: source.replyToMessageId,
    });
    if (!target || !target.records.length) {
      recordSiteManagerToolCall({ name: "replace_last_site_diary_batch", durationMs: Date.now() - started, ok: false });
      return correctionResult({ status: "no_eligible_batch", language: args.language });
    }
    const oldRecordCount = target.records.length;
    if (target.records.some((record) => Boolean(record.BISId))) {
      recordSiteManagerToolCall({ name: "replace_last_site_diary_batch", durationMs: Date.now() - started, ok: false });
      return correctionResult({ status: "blocked_bis", language: args.language, oldRecordCount });
    }
    const extraction = await extractAndSaveSiteDiary({
      question: `ORIGINAL REPORT (trusted):\n${target.batch.originalText}\n\nUSER CORRECTION (takes precedence):\n${args.correction}\n\nReturn the complete corrected diary batch.`,
      persist: false,
    });
    if (!extraction.ok || !extraction.rows?.length) {
      await startSiteDiaryCorrection({
        siteId: context.siteId,
        userId: context.userId,
        messageId: source.messageId,
        replyToMessageId: source.replyToMessageId,
      });
      recordSiteManagerToolCall({ name: "replace_last_site_diary_batch", durationMs: Date.now() - started, ok: false });
      return correctionResult({
        status: "needs_clarification",
        language: args.language,
        oldRecordCount,
      });
    }
    const result = await archiveAndReplaceSiteDiaryBatch({
      siteId: context.siteId,
      userId: context.userId,
      correctionMessageId: source.messageId,
      correctionText: args.correction,
      rows: extraction.rows,
      replyToMessageId: source.replyToMessageId,
      evalMetadata: runContext?.evalRecordMetadata,
    });
    if (!result.ok) {
      recordSiteManagerToolCall({ name: "replace_last_site_diary_batch", durationMs: Date.now() - started, ok: false });
      return correctionResult({
        status: correctionStatusFromReason(result.reason),
        language: args.language, 
        oldRecordCount,
      });
    }
    if (result.records?.length) {
      recordStructuredSaveTrace({
        siteId: context.siteId,
        userId: context.userId,
        date: currentDiaryDate(),
        originalUserComment: `${target.batch.originalText}\nCorrection: ${args.correction}`,
        rawRecords: extraction.rows,
        mappedRows: extraction.rows,
        normalizedInsertRows: extraction.rows,
        persistedRecords: result.records as Record<string, unknown>[],
      });
    }
    recordSiteManagerToolCall({ name: "replace_last_site_diary_batch", durationMs: Date.now() - started, ok: true });
    return correctionResult({
      status: result.idempotent ? "idempotent" : "replaced",
      language: args.language,
      oldRecordCount: result.oldCount ?? oldRecordCount,
      newRecordCount: result.count,
      records: toConfirmationRecords(result.records),
    });
  } catch (error) {
    recordSiteManagerToolCall({ name: "replace_last_site_diary_batch", durationMs: Date.now() - started, ok: false });
    return correctionResult({
      status: "failed",
      language: args.language,
      message: error instanceof Error ? error.message : "Unknown correction error",
    });
  }
}

export const startSiteDiaryCorrectionTool = new DynamicStructuredTool({
  name: "start_site_diary_correction",
  description: "Start a correction only when the complete message asks to change an earlier WhatsApp diary report but does not yet say what the corrected facts are. Never select this from a standalone keyword.",
  schema: z.object({}),
  async func() {
    return serializeCorrectionToolResult(await startSiteDiaryCorrectionOperation({
      language: detectReplyLanguage(getSiteManagerToolContext()?.originalUserComment ?? ""),
    }));
  },
});

export const replaceLastSiteDiaryBatchTool = new DynamicStructuredTool({
  name: "replace_last_site_diary_batch",
  description: "Archive and replace a previous WhatsApp diary batch. Use only when the complete message clearly supplies a correction, or when a pending correction session makes the current message the correction. Pass only the current user's correction text; trusted historical records are loaded internally.",
  schema: z.object({
    correction: z.string().min(1).describe("Only the current user's correction text. Never include record IDs or invented historical text."),
  }),
  async func({ correction }) {
    return serializeCorrectionToolResult(await replaceLastSiteDiaryBatchOperation({
      correction,
      language: detectReplyLanguage(getSiteManagerToolContext()?.originalUserComment ?? correction),
    }));
  },
});

function serializeBisResult(value: unknown) {
  return JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item);
}

async function withToolMetric<T>(name: string, fn: () => Promise<T>) {
  const started = Date.now();
  try {
    const result = await fn();
    recordSiteManagerToolCall({ name, durationMs: Date.now() - started, ok: true });
    return result;
  } catch (error) {
    recordSiteManagerToolCall({ name, durationMs: Date.now() - started, ok: false });
    throw error;
  }
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
      const result = await withToolMetric("get_bis_connection_status", () =>
        getBisConnectionStatus(
          { siteId: context.siteId, userId: context.userId },
          { connectionOverride: getSiteManagerAgentRunContext()?.bisConnectionOverride },
        ));
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
      return serializeBisResult(await withToolMetric("read_bis_material_records", () =>
        readBisMaterialRecords(
          { siteId: context.siteId, userId: context.userId },
          { search, limit },
        )));
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
      return serializeBisResult(await withToolMetric("read_site_diary_bis_statuses", () =>
        readSiteDiaryBisStatuses(
          { siteId: context.siteId, userId: context.userId },
          { submission, search, limit },
        )));
    } catch {
      return serializeBisResult({ error: "Site diary BIS statuses could not be read." });
    }
  },
});

export const tools = [
  siteDiaryToDatabaseTool,
  startSiteDiaryCorrectionTool,
  replaceLastSiteDiaryBatchTool,
  bisConnectionStatusTool,
  bisMaterialRecordsTool,
  siteDiaryBisStatusesTool,
]

export const toolNode = new ToolNode<typeof GraphState.State>(tools)
