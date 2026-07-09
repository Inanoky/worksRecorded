import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type EvalFlow = "dashboard-chat" | "whatsapp-site-manager" | "whatsapp-worker" | string;
export type EvalStatus = "pass" | "warn" | "fail" | "unknown";
export type AnomalySeverity = "critical" | "warning" | "info";

export type EvalAnomaly = {
  severity: AnomalySeverity;
  code: string;
  message: string;
};

export type NormalizedEvalItem = {
  id: string;
  caseId: string;
  label: string;
  input: string;
  answer: string;
  outboundMessages: string[];
  status: EvalStatus;
  judgeStatus: EvalStatus | "skipped";
  judgeExplanation: string;
  judgeImprovements: string[];
  latencyMs: number;
  actualModel: string | null;
  requestedModel: string | null;
  finishReason: string | null;
  tokenTotal: number | null;
  tokenInput: number | null;
  tokenOutput: number | null;
  validationResults: Array<{ name: string; status: string; message: string }>;
  failedValidators: Array<{ name: string; status: string; message: string }>;
  contextTokens: {
    original: number | null;
    compacted: number | null;
    saved: number | null;
  };
  judge: unknown;
  artifacts: Record<string, unknown>;
  anomalies: EvalAnomaly[];
};

export type NormalizedEvalRun = {
  fileName: string;
  runId: string;
  flow: EvalFlow;
  model: string | null;
  requestedModel: string | null;
  actualModels: string[];
  startedAt: string | null;
  finishedAt: string | null;
  summary: Record<string, unknown>;
  latency: Record<string, unknown>;
  status: EvalStatus;
  items: NormalizedEvalItem[];
  anomalies: EvalAnomaly[];
  raw: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function preview(value: string, maxLength = 160) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= maxLength ? compact : `${compact.slice(0, maxLength)}...`;
}

function normalizeStatus(value: unknown): EvalStatus {
  return value === "pass" || value === "warn" || value === "fail" ? value : "unknown";
}

function normalizeJudgeStatus(value: unknown): EvalStatus | "skipped" {
  return value === "pass" || value === "warn" || value === "fail" || value === "skipped"
    ? value
    : "unknown";
}

function getTokenUsage(tokenUsage: unknown) {
  const usage = asRecord(tokenUsage);
  const input = asNumber(usage.input_tokens) ?? asNumber(usage.promptTokens) ?? asNumber(usage.inputTokens);
  const output = asNumber(usage.output_tokens) ?? asNumber(usage.completionTokens) ?? asNumber(usage.outputTokens);
  return {
    input,
    output,
    total: asNumber(usage.total_tokens) ?? asNumber(usage.totalTokens) ??
      (input !== null || output !== null ? (input ?? 0) + (output ?? 0) : null),
  };
}

function textFromGraphMessage(message: unknown) {
  const body = asRecord(asRecord(message).body);
  const textBody = asString(asRecord(body.text).body);
  const interactiveBody = asString(asRecord(asRecord(body.interactive).body).text);
  const interactiveHeader = asString(asRecord(asRecord(body.interactive).header).text);
  return [interactiveHeader, interactiveBody, textBody].filter(Boolean).join("\n").trim();
}

function containsSensitiveValue(value: unknown, key?: string): boolean {
  if (typeof value === "string") {
    if (/token=(?!\[redacted\])[^&\s"]{12,}/.test(value)) return true;
    if (/lookaside\.fbsbx\.com/i.test(value)) return true;
    if ((key === "to" || key === "recipient") && /^\+?\d{8,}$/.test(value)) return true;
    return false;
  }

  if (Array.isArray(value)) return value.some((item) => containsSensitiveValue(item, key));

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(([nestedKey, nestedValue]) =>
      containsSensitiveValue(nestedValue, nestedKey),
    );
  }

  return false;
}

function stringifyArtifact(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value ?? "");
  }
}

function hasClockInCard(item: NormalizedEvalItem) {
  return stringifyArtifact(item.artifacts.graphMessages).includes("cta_url") && item.caseId.includes("clock-in");
}

function itemTextForDuplicate(item: NormalizedEvalItem) {
  return item.answer.replace(/\s+/g, " ").trim().toLocaleLowerCase("lv-LV");
}

function makeItem(rawItem: unknown, index: number, flow: EvalFlow): NormalizedEvalItem {
  const item = asRecord(rawItem);
  const deterministic = asRecord(item.deterministic);
  const controlledMemory = asRecord(item.controlledMemory);
  const judge = asRecord(item.judge);
  const turnIndex = asNumber(item.turnIndex);
  const caseId = asString(item.caseId) || `item-${index + 1}`;
  const label = turnIndex === null ? caseId : `${caseId} turn ${turnIndex + 1}`;
  const graphMessages = asArray(item.graphMessages);
  const selectedRecord = item.selectedRecord ?? null;
  const structuredSaveTrace = item.structuredSaveTrace ?? null;
  const deterministicResults = asArray(deterministic.results);
  const controlledChecks = asArray(controlledMemory.checks);
  const rawValidationResults = deterministicResults.length
    ? deterministicResults
    : controlledChecks.length
      ? controlledChecks
      : asString(controlledMemory.status)
        ? [{
            name: "controlled-memory",
            status: controlledMemory.status,
            message: controlledMemory.message,
          }]
        : [];
  const validationResults = rawValidationResults.map((result) => {
    const record = asRecord(result);
    return {
      name: asString(record.name),
      status: asString(record.status),
      message: asString(record.message),
    };
  });
  const tokenUsage = getTokenUsage(
    Object.keys(asRecord(item.tokenUsage)).length ? item.tokenUsage : item.aggregateTokenUsage,
  );
  const originalContextTokens = asNumber(controlledMemory.originalEstimatedTokens);
  const compactedContextTokens = asNumber(controlledMemory.compactedEstimatedTokens);
  const normalizedStatus = normalizeStatus(deterministic.status) !== "unknown"
    ? normalizeStatus(deterministic.status)
    : normalizeStatus(controlledMemory.status);

  const input =
    asString(item.promptPreview) ||
    asString(item.inputPreview) ||
    preview(asString(item.prompt) || asString(item.inputText));

  return {
    id: `${caseId}:${turnIndex ?? index}`,
    caseId,
    label,
    input,
    answer: asString(item.answer),
    outboundMessages: graphMessages.map(textFromGraphMessage).filter(Boolean),
    status: normalizedStatus,
    judgeStatus: normalizeJudgeStatus(judge.status),
    judgeExplanation: asString(judge.explanation),
    judgeImprovements: asArray(judge.improvements).filter(
      (improvement): improvement is string => typeof improvement === "string",
    ),
    latencyMs: asNumber(item.latencyMs) ?? 0,
    actualModel: asString(item.actualModel) || null,
    requestedModel: asString(item.requestedModel) || null,
    finishReason: asString(item.finishReason) || null,
    tokenTotal: tokenUsage.total,
    tokenInput: tokenUsage.input,
    tokenOutput: tokenUsage.output,
    validationResults,
    failedValidators: validationResults.filter((result) => result.status === "fail"),
    contextTokens: {
      original: originalContextTokens,
      compacted: compactedContextTokens,
      saved: originalContextTokens !== null && compactedContextTokens !== null
        ? Math.max(0, originalContextTokens - compactedContextTokens)
        : null,
    },
    judge: item.judge ?? null,
    artifacts: {
      flow,
      graphMessages,
      selectedRecord,
      structuredSaveTrace,
      createdRecordIds: item.createdRecordIds ?? item.createdDiaryRecordIds ?? null,
      timelogRecordIds: item.timelogRecordIds ?? null,
      webhookMessageId: item.webhookMessageId ?? null,
      threadId: item.threadId ?? null,
      controlledMemory: item.controlledMemory ?? null,
      aggregateTokenUsage: item.aggregateTokenUsage ?? null,
      modelCalls: item.modelCalls ?? null,
      toolCalls: item.toolCalls ?? null,
    },
    anomalies: [],
  };
}

function detectItemAnomalies(
  item: NormalizedEvalItem,
  flow: EvalFlow,
  averageLatencyMs: number,
  duplicateAnswers: Set<string>,
) {
  const anomalies: EvalAnomaly[] = [];
  const reviewPayload = {
    answer: item.answer,
    outboundMessages: item.outboundMessages,
    artifacts: item.artifacts,
  };
  const responseText = [item.answer, ...item.outboundMessages].join("\n").trim();
  const expectedToolCalls = hasClockInCard(item);
  const failedLanguageChecks = item.validationResults.filter(
    (result) => result.status === "fail" && /language|latvian|english|valod/i.test(result.name + result.message),
  );

  if (!responseText && item.actualModel && !expectedToolCalls) {
    anomalies.push({
      severity: "warning",
      code: "empty-response",
      message: "Model metadata exists but no answer or outbound response text was captured.",
    });
  }

  if (item.caseId.includes("clock-in-card") && (!item.actualModel || !item.tokenTotal)) {
    anomalies.push({
      severity: "warning",
      code: "missing-model-metadata",
      message: "Clock-in card case should still retain model and token metadata.",
    });
  }

  if (containsSensitiveValue(reviewPayload)) {
    anomalies.push({
      severity: "critical",
      code: "sensitive-output",
      message: "Response or artifacts appear to contain an unredacted token, phone number, or temporary Meta URL.",
    });
  }

  if (failedLanguageChecks.length > 0) {
    anomalies.push({
      severity: "warning",
      code: "language-check-failed",
      message: "A deterministic language-related check failed.",
    });
  }

  if (/read-only|lasīšanas rež/i.test(item.input) && /saved successfully|created successfully|saglabāts veiksmīgi/i.test(responseText)) {
    anomalies.push({
      severity: "critical",
      code: "unsafe-readonly-confirmation",
      message: "Read-only eval response appears to include a save/create confirmation.",
    });
  }

  const longThreshold = flow === "dashboard-chat" ? 1200 : 900;
  if (responseText.length > longThreshold) {
    anomalies.push({
      severity: "info",
      code: "long-response",
      message: `Response is ${responseText.length} characters, which is unusually long for ${flow}.`,
    });
  }

  if (averageLatencyMs > 0 && item.latencyMs > Math.max(15000, averageLatencyMs * 1.75)) {
    anomalies.push({
      severity: "info",
      code: "high-latency",
      message: `Latency ${item.latencyMs}ms is high compared with run average ${Math.round(averageLatencyMs)}ms.`,
    });
  }

  if (item.finishReason && item.finishReason !== "stop" && !(item.finishReason === "tool_calls" && expectedToolCalls)) {
    anomalies.push({
      severity: "warning",
      code: "unexpected-finish-reason",
      message: `Finish reason "${item.finishReason}" deserves review.`,
    });
  }

  const duplicateKey = itemTextForDuplicate(item);
  if (duplicateKey && duplicateAnswers.has(duplicateKey)) {
    anomalies.push({
      severity: "info",
      code: "repeated-answer",
      message: "This answer text is repeated in another case in the same run.",
    });
  }

  return anomalies;
}

function severityRank(severity: AnomalySeverity) {
  return severity === "critical" ? 3 : severity === "warning" ? 2 : 1;
}

function runStatusFromSummary(summary: Record<string, unknown>, items: NormalizedEvalItem[]): EvalStatus {
  const hasFailures = Object.entries(summary).some(
    ([key, value]) => /fail/i.test(key) && typeof value === "number" && value > 0,
  );
  if (hasFailures || items.some((item) => item.status === "fail" || item.judgeStatus === "fail")) return "fail";

  const hasWarnings = Object.entries(summary).some(
    ([key, value]) => /warn/i.test(key) && typeof value === "number" && value > 0,
  );
  if (hasWarnings || items.some((item) => item.status === "warn" || item.judgeStatus === "warn")) return "warn";

  return "pass";
}

export function normalizeEvalReport(raw: unknown, fileName = "report.json"): NormalizedEvalRun {
  const report = asRecord(raw);
  const flow = asString(report.flow) || "unknown";
  const rawItems = asArray(report.results);
  const items = rawItems.map((item, index) => makeItem(item, index, flow));
  const averageLatencyMs =
    asNumber(asRecord(report.latency).averageMs) ??
    (items.length ? items.reduce((total, item) => total + item.latencyMs, 0) / items.length : 0);
  const answerCounts = new Map<string, number>();

  for (const item of items) {
    const key = itemTextForDuplicate(item);
    if (key) answerCounts.set(key, (answerCounts.get(key) ?? 0) + 1);
  }

  const duplicateAnswers = new Set(
    [...answerCounts.entries()].filter(([, count]) => count > 1).map(([answer]) => answer),
  );

  for (const item of items) {
    item.anomalies = detectItemAnomalies(item, flow, averageLatencyMs, duplicateAnswers).sort(
      (left, right) => severityRank(right.severity) - severityRank(left.severity),
    );
  }

  const summary = asRecord(report.summary);
  const runAnomalies = items.flatMap((item) =>
    item.anomalies.map((anomaly) => ({
      ...anomaly,
      message: `${item.label}: ${anomaly.message}`,
    })),
  );

  return {
    fileName,
    runId: asString(report.runId) || fileName.replace(/\.json$/, ""),
    flow,
    model: asString(report.model) || null,
    requestedModel: asString(report.requestedModel) || null,
    actualModels: asArray(report.actualModels).filter((model): model is string => typeof model === "string"),
    startedAt: asString(report.startedAt) || null,
    finishedAt: asString(report.finishedAt) || null,
    summary,
    latency: asRecord(report.latency),
    status: runStatusFromSummary(summary, items),
    items,
    anomalies: runAnomalies.sort((left, right) => severityRank(right.severity) - severityRank(left.severity)),
    raw,
  };
}

export async function loadEvalReports(resultsDir = path.join(process.cwd(), ".ai-eval-results")) {
  let entries: string[] = [];
  try {
    entries = await readdir(resultsDir);
  } catch {
    return [];
  }

  const reports = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) => {
        const fullPath = path.join(resultsDir, entry);
        try {
          const parsed = JSON.parse(await readFile(fullPath, "utf8"));
          return normalizeEvalReport(parsed, entry);
        } catch (error) {
          return normalizeEvalReport(
            {
              runId: entry.replace(/\.json$/, ""),
              flow: "invalid-report",
              results: [],
              summary: { deterministicFailures: 1 },
              parseError: error instanceof Error ? error.message : String(error),
            },
            entry,
          );
        }
      }),
  );

  return reports.sort((left, right) => {
    const leftTime = left.startedAt ? new Date(left.startedAt).getTime() : 0;
    const rightTime = right.startedAt ? new Date(right.startedAt).getTime() : 0;
    return rightTime - leftTime || right.fileName.localeCompare(left.fileName);
  });
}
