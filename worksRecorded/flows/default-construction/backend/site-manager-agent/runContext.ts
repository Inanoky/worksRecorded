import { AsyncLocalStorage } from "node:async_hooks";

export type SiteManagerAgentRunDetails = {
  content: string;
  requestedModel: string;
  actualModel: string | null;
  tokenUsage: unknown;
  usageMetadata: unknown;
  responseMetadata: unknown;
  finishReason: string | null;
  executionPath: "legacy-agent" | "fast-path";
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
export type SiteManagerExecutionPath = "legacy-agent" | "fast-path";
export type FastPathOutcome = "save" | "fallback" | "skipped" | "error";
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
  purpose: "routing" | "final-response" | "structured-extraction" | "fast-path-extraction";
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
