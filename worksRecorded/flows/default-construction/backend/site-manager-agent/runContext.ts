import { AsyncLocalStorage } from "node:async_hooks";

export type SiteManagerAgentRunDetails = {
  content: string;
  requestedModel: string;
  actualModel: string | null;
  tokenUsage: unknown;
  usageMetadata: unknown;
  responseMetadata: unknown;
  finishReason: string | null;
  executionPath: "legacy-agent" | "fast-path" | "correction-path";
  fastPathMode: "off" | "shadow" | "on";
  timings: Record<string, number>;
  modelCalls: SiteManagerModelCallMetric[];
  toolCalls: SiteManagerToolCallMetric[];
  aggregateTokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

export type FastPathMode = "off" | "shadow" | "on";
export type SiteManagerExecutionPath = "legacy-agent" | "fast-path" | "correction-path";
export type FastPathOutcome = "save" | "correction" | "clarify" | "fallback" | "skipped" | "error";
export type FastPathFallbackReason =
  | "ineligible"
  | "model-fallback"
  | "no-records"
  | "extraction-error";

export type FastPathTraceMetadata = {
  fastPathMode: FastPathMode;
  fastPathCandidate: boolean;
  executionPath: SiteManagerExecutionPath;
  fastPathAttempted: boolean;
  fastPathOutcome: FastPathOutcome;
  fallbackReason?: FastPathFallbackReason;
};

export function fastPathTraceConfig(metadata: FastPathTraceMetadata) {
  return {
    metadata,
    tags: [`execution-path:${metadata.executionPath}`],
  };
}

export type SiteManagerModelCallMetric = {
  purpose:
    | "routing"
    | "final-response"
    | "structured-extraction"
    | "structured-repair-extraction"
    | "fast-path-extraction"
    | "site_diary_extraction_checker";
  model: string;
  actualModel: string | null;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type SiteManagerToolCallMetric = {
  name: string;
  durationMs: number;
  ok: boolean;
};

type SiteManagerRunMetrics = {
  executionPath: SiteManagerExecutionPath;
  fastPathMode: FastPathMode;
  timings: Record<string, number>;
  modelCalls: SiteManagerModelCallMetric[];
  toolCalls: SiteManagerToolCallMetric[];
};

export type SiteManagerAgentRunOptions = {
  threadId?: string;
  traceMetadata?: Record<string, string | number | boolean | null | undefined>;
  traceTags?: string[];
  senderFirstName?: string | null;
  senderLastName?: string | null;
  senderName?: string | null;
  senderInitials?: string | null;
  senderLabel?: string | null;
  evalRecordMetadata?: Record<string, unknown>;
  model?: string;
  bisConnectionOverride?: {
    status: "not-connected" | "case-not-selected" | "ready";
    siteName?: string;
    caseNumber?: string;
    caseName?: string;
  };
};

export type SiteManagerAgentRunContext = SiteManagerAgentRunOptions & {
  details: SiteManagerAgentRunDetails | null;
  metrics: SiteManagerRunMetrics;
  fastPathTrace?: FastPathTraceMetadata;
};

const siteManagerAgentRunStorage = new AsyncLocalStorage<SiteManagerAgentRunContext>();

function normalizeTraceNamePart(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function buildInitials(parts: string[]) {
  const initials = parts
    .map((part) => [...part][0])
    .filter(Boolean)
    .join("")
    .toUpperCase();
  return initials || null;
}

export function buildSiteManagerSenderTraceContext(args: {
  firstName?: string | null;
  lastName?: string | null;
}) {
  const firstName = normalizeTraceNamePart(args.firstName);
  const lastName = normalizeTraceNamePart(args.lastName);
  const nameParts = [firstName, lastName].filter(Boolean);
  const senderName = nameParts.join(" ") || null;
  const senderInitials = buildInitials(nameParts);
  const senderLabel = senderName ?? senderInitials;

  return {
    senderFirstName: firstName || null,
    senderLastName: lastName || null,
    senderName,
    senderInitials,
    senderLabel,
  };
}

export function getSiteManagerSenderTraceMetadata(
  context: Pick<SiteManagerAgentRunOptions, "senderFirstName" | "senderLastName" | "senderName" | "senderInitials" | "senderLabel"> | null | undefined,
) {
  return {
    senderFirstName: context?.senderFirstName ?? undefined,
    senderLastName: context?.senderLastName ?? undefined,
    senderName: context?.senderName ?? undefined,
    senderInitials: context?.senderInitials ?? undefined,
    senderLabel: context?.senderLabel ?? undefined,
  };
}

export function getSiteManagerSenderTraceTags(
  context: Pick<SiteManagerAgentRunOptions, "senderLabel"> | null | undefined,
) {
  return context?.senderLabel ? [`sender:${context.senderLabel}`] : [];
}

export function setSiteManagerSenderTraceContext(
  senderContext: Pick<SiteManagerAgentRunOptions, "senderFirstName" | "senderLastName" | "senderName" | "senderInitials" | "senderLabel">,
) {
  const context = getSiteManagerAgentRunContext();
  if (!context) return false;
  context.senderFirstName = senderContext.senderFirstName;
  context.senderLastName = senderContext.senderLastName;
  context.senderName = senderContext.senderName;
  context.senderInitials = senderContext.senderInitials;
  context.senderLabel = senderContext.senderLabel;
  return true;
}

export async function runWithSiteManagerAgentEvalContext<T>(
  options: SiteManagerAgentRunOptions,
  fn: () => Promise<T>,
) {
  const context: SiteManagerAgentRunContext = {
    ...options,
    details: null,
    metrics: {
      executionPath: "legacy-agent",
      fastPathMode: "off",
      timings: {},
      modelCalls: [],
      toolCalls: [],
    },
  };

  const result = await siteManagerAgentRunStorage.run(context, fn);
  return {
    result,
    details: context.details,
  };
}

export function getSiteManagerAgentRunContext() {
  return siteManagerAgentRunStorage.getStore();
}

export function setSiteManagerExecutionPath(
  executionPath: SiteManagerRunMetrics["executionPath"],
  fastPathMode: SiteManagerRunMetrics["fastPathMode"],
) {
  const context = getSiteManagerAgentRunContext();
  if (!context) return;
  context.metrics.executionPath = executionPath;
  context.metrics.fastPathMode = fastPathMode;
}

export function recordSiteManagerTiming(name: string, durationMs: number) {
  const context = getSiteManagerAgentRunContext();
  if (!context) return;
  context.metrics.timings[name] = (context.metrics.timings[name] ?? 0) + durationMs;
}

export function recordSiteManagerModelCall(metric: SiteManagerModelCallMetric) {
  getSiteManagerAgentRunContext()?.metrics.modelCalls.push(metric);
}

export function recordSiteManagerToolCall(metric: SiteManagerToolCallMetric) {
  getSiteManagerAgentRunContext()?.metrics.toolCalls.push(metric);
}

export function getSiteManagerMetricsSnapshot() {
  const metrics = getSiteManagerAgentRunContext()?.metrics;
  const modelCalls = [...(metrics?.modelCalls ?? [])];
  return {
    executionPath: metrics?.executionPath ?? "legacy-agent" as const,
    fastPathMode: metrics?.fastPathMode ?? "off" as const,
    timings: { ...(metrics?.timings ?? {}) },
    modelCalls,
    toolCalls: [...(metrics?.toolCalls ?? [])],
    aggregateTokenUsage: modelCalls.reduce(
      (total, call) => ({
        inputTokens: total.inputTokens + call.inputTokens,
        outputTokens: total.outputTokens + call.outputTokens,
        totalTokens: total.totalTokens + call.totalTokens,
      }),
      { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    ),
  };
}
