import { RemoveMessage, ToolMessage } from "@langchain/core/messages";
import { REMOVE_ALL_MESSAGES } from "@langchain/langgraph";

type ToolCallShape = {
  id?: string | null;
  name?: string | null;
  function?: { id?: string | null; name?: string | null };
};

export type ControlledMemoryStats = {
  originalCount: number;
  preparedCount: number;
  droppedDanglingAssistantToolCalls: number;
  droppedOrphanToolMessages: number;
  droppedOlderSystemMessages: number;
  compactedCount: number;
  beforeChars: number;
  afterChars: number;
  beforeTokens: number;
  afterTokens: number;
  compactedByTool: Record<string, number>;
  maxToolCharsAfter: number;
};

export type ControlledMemoryResult = {
  messages: any[];
  stats: ControlledMemoryStats;
};

export type ControlledMemoryOptions = {
  recentWindow?: number;
  recentLimit?: number;
  recentToolCharThreshold?: number;
  olderToolCharThreshold?: number;
  targetTokenBudget?: number;
};

const DEFAULT_RECENT_WINDOW = 10;
const DEFAULT_RECENT_LIMIT = 20;
const DEFAULT_RECENT_TOOL_CHAR_THRESHOLD = 8_000;
const DEFAULT_OLDER_TOOL_CHAR_THRESHOLD = 2_000;
const DEFAULT_TARGET_TOKEN_BUDGET = 24_000;

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function estimateTokensFromChars(chars: number): number {
  if (!Number.isFinite(chars) || chars <= 0) return 0;
  return Math.ceil(chars / 4);
}

function getMessageContentString(message: any): string {
  if (!message) return "";
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .map((block: any) => {
        if (typeof block === "string") return block;
        if (block && typeof block === "object") {
          return block.text ?? JSON.stringify(block);
        }
        return String(block);
      })
      .join("");
  }
  return String(message.content ?? "");
}

function getMessageChars(message: any): number {
  return getMessageContentString(message).length;
}

function getMessageType(message: any): string {
  if (!message || typeof message !== "object") return "";
  if (typeof message.getType === "function") {
    try {
      return message.getType();
    } catch {
      return "";
    }
  }
  if (typeof message._getType === "function") return message._getType();
  return typeof message.type === "string" ? message.type : "";
}

function isSystemMessage(message: any): boolean {
  return getMessageType(message) === "system";
}

function isToolMessage(message: any): boolean {
  if (getMessageType(message) === "tool") return true;
  const directId = message?.tool_call_id;
  const kwargsId = message?.additional_kwargs?.tool_call_id;
  return typeof directId === "string" || typeof kwargsId === "string";
}

function getToolCalls(message: any): ToolCallShape[] {
  if (!message || typeof message !== "object") return [];
  const directCalls = asArray<ToolCallShape>(message.tool_calls);
  if (directCalls.length) return directCalls;
  return asArray<ToolCallShape>(message.additional_kwargs?.tool_calls);
}

function getToolCallIdFromCall(toolCall: ToolCallShape): string | null {
  const maybeId = toolCall?.id ?? toolCall?.function?.id;
  return typeof maybeId === "string" && maybeId.length > 0 ? maybeId : null;
}

function getToolCallIdFromMessage(message: any): string {
  const directId = message?.tool_call_id;
  if (typeof directId === "string" && directId.length > 0) return directId;
  const kwargsId = message?.additional_kwargs?.tool_call_id;
  if (typeof kwargsId === "string" && kwargsId.length > 0) return kwargsId;
  return "";
}

function getToolName(message: any): string {
  return message?.name || message?.additional_kwargs?.name || "unknown_tool";
}

function compactText(value: string, maxLength: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function tryJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function summarizeJsonRows(value: unknown) {
  const rows = Array.isArray(value) ? value : null;
  if (!rows) return null;
  const objectRows = rows.filter((row) => row && typeof row === "object" && !Array.isArray(row));
  const columns = [...new Set(objectRows.flatMap((row) => Object.keys(row as Record<string, unknown>)))].slice(0, 20);
  return {
    rowCount: rows.length,
    columns,
    sampleRows: objectRows.slice(0, 3),
  };
}

function extractUrls(text: string) {
  return [...text.matchAll(/https?:\/\/[^\s)]+/g)].map((match) => match[0]).slice(0, 5);
}

function isSqlTool(toolName: string) {
  return /sql|postgres|database_query|records_database/i.test(toolName);
}

function isSaveTool(toolName: string) {
  return /save|database|diarytodatabase/i.test(toolName);
}

function isWebOrPythonTool(toolName: string) {
  return /websearch|python|code/i.test(toolName);
}

export function summarizeToolOutput(toolName: string, content: string, originalChars = content.length): string {
  const parsed = tryJson(content);
  const rowSummary = summarizeJsonRows(parsed);
  const urls = extractUrls(content);

  const lines = [
    "[TOOL OUTPUT COMPACTED]",
    `Tool Name: ${toolName}`,
    `Original Size: ~${originalChars} characters (approx. ${estimateTokensFromChars(originalChars)} tokens)`,
  ];

  if (isSqlTool(toolName) && rowSummary) {
    lines.push(
      "Summary Type: SQL/database rows",
      `Row Count: ${rowSummary.rowCount}`,
      `Columns: ${rowSummary.columns.join(", ") || "unknown"}`,
      `Sample Rows: ${JSON.stringify(rowSummary.sampleRows)}`,
    );
  } else if (isSaveTool(toolName)) {
    lines.push(
      "Summary Type: database mutation result",
      `Status Preview: ${compactText(content, 500)}`,
    );
  } else if (isWebOrPythonTool(toolName)) {
    lines.push(
      "Summary Type: web/python result",
      `Result Preview: ${compactText(content, 700)}`,
    );
    if (urls.length) lines.push(`Preserved URLs: ${urls.join(" ")}`);
  } else {
    lines.push(
      "Summary Type: generic tool result",
      `Preview: ${compactText(content, 700)}`,
    );
  }

  lines.push(
    "[NOTE TO MODEL]",
    "This is historical tool output. Re-run the relevant read tool if exact old rows or full raw output are required.",
  );

  return lines.join("\n");
}

export function summarizeSqlRowsForTool(rows: unknown, toolName: string, maxChars = 12_000): string {
  const safe = JSON.stringify(rows, (_, v) => (typeof v === "bigint" ? v.toString() : v));
  if (safe.length <= maxChars) return safe;

  const parsed = tryJson(safe);
  const rowSummary = summarizeJsonRows(parsed);
  if (!rowSummary) return summarizeToolOutput(toolName, safe, safe.length);

  return [
    "[BOUNDED SQL TOOL RESULT]",
    `Tool Name: ${toolName}`,
    `Original Size: ~${safe.length} characters (approx. ${estimateTokensFromChars(safe.length)} tokens)`,
    `Row Count: ${rowSummary.rowCount}`,
    `Columns: ${rowSummary.columns.join(", ") || "unknown"}`,
    `Sample Rows: ${JSON.stringify(rowSummary.sampleRows)}`,
    "Exactness Policy: This result was bounded before checkpoint persistence. Re-run the tool with a narrower query if exact rows are needed.",
  ].join("\n");
}

function cloneCompactedToolMessage(message: any, compactedContent: string): any {
  if (typeof message.getType === "function") {
    return new ToolMessage({
      content: compactedContent,
      tool_call_id: getToolCallIdFromMessage(message),
      name: getToolName(message),
      id: message.id,
      additional_kwargs: message.additional_kwargs ? { ...message.additional_kwargs } : undefined,
      response_metadata: message.response_metadata ? { ...message.response_metadata } : undefined,
    });
  }

  return { ...message, content: compactedContent };
}

function sanitizeStructure(messages: any[]) {
  const sanitized: any[] = [];
  const stats = {
    droppedDanglingAssistantToolCalls: 0,
    droppedOrphanToolMessages: 0,
    droppedOlderSystemMessages: 0,
  };

  const lastSystemIndex = (() => {
    for (let idx = messages.length - 1; idx >= 0; idx -= 1) {
      if (isSystemMessage(messages[idx])) return idx;
    }
    return -1;
  })();

  let i = 0;
  while (i < messages.length) {
    const current = messages[i];

    if (isSystemMessage(current) && i !== lastSystemIndex) {
      stats.droppedOlderSystemMessages += 1;
      i += 1;
      continue;
    }

    if (isToolMessage(current)) {
      stats.droppedOrphanToolMessages += 1;
      i += 1;
      continue;
    }

    const toolCalls = getToolCalls(current);
    if (!toolCalls.length) {
      sanitized.push(current);
      i += 1;
      continue;
    }

    const expectedIds = new Set<string>();
    for (const toolCall of toolCalls) {
      const id = getToolCallIdFromCall(toolCall);
      if (id) expectedIds.add(id);
    }

    const contiguousToolMessages: any[] = [];
    const respondedIds = new Set<string>();
    let j = i + 1;
    while (j < messages.length && isToolMessage(messages[j])) {
      contiguousToolMessages.push(messages[j]);
      const toolCallId = getToolCallIdFromMessage(messages[j]);
      if (toolCallId) respondedIds.add(toolCallId);
      j += 1;
    }

    const isComplete = expectedIds.size > 0 && [...expectedIds].every((id) => respondedIds.has(id));
    if (isComplete) {
      sanitized.push(current, ...contiguousToolMessages);
    } else {
      stats.droppedDanglingAssistantToolCalls += 1;
      stats.droppedOrphanToolMessages += contiguousToolMessages.length;
    }

    i = j;
  }

  return { messages: sanitized, stats };
}

export function prepareControlledModelMessages(
  messages: any[],
  options: ControlledMemoryOptions = {},
): ControlledMemoryResult {
  const recentWindow = options.recentWindow ?? DEFAULT_RECENT_WINDOW;
  const recentLimit = options.recentLimit ?? DEFAULT_RECENT_LIMIT;
  const recentToolCharThreshold = options.recentToolCharThreshold ?? DEFAULT_RECENT_TOOL_CHAR_THRESHOLD;
  const olderToolCharThreshold = options.olderToolCharThreshold ?? DEFAULT_OLDER_TOOL_CHAR_THRESHOLD;
  const targetTokenBudget = options.targetTokenBudget ?? DEFAULT_TARGET_TOKEN_BUDGET;

  const beforeChars = messages.reduce((acc, m) => acc + getMessageChars(m), 0);
  const sanitized = sanitizeStructure(messages);
  const sanitizedMessages = sanitized.messages;
  const total = sanitizedMessages.length;
  const untouchedIndices = new Set<number>();

  const startUntouched = Math.max(0, total - recentWindow);
  for (let i = startUntouched; i < total; i += 1) untouchedIndices.add(i);

  let trailingIdx = total - 1;
  while (trailingIdx >= 0 && isToolMessage(sanitizedMessages[trailingIdx])) {
    untouchedIndices.add(trailingIdx);
    trailingIdx -= 1;
  }

  let compactedCount = 0;
  const compactedByTool: Record<string, number> = {};

  const compactedMessages = sanitizedMessages.map((message, idx) => {
    if (!isToolMessage(message) || untouchedIndices.has(idx)) return message;

    const content = getMessageContentString(message);
    const chars = content.length;
    const isRecent = idx >= total - recentLimit;
    const threshold = isRecent ? recentToolCharThreshold : olderToolCharThreshold;
    const overBudget = estimateTokensFromChars(beforeChars) > targetTokenBudget && chars > 1_000;

    if (chars <= threshold && !overBudget) return message;

    const toolName = getToolName(message);
    compactedCount += 1;
    compactedByTool[toolName] = (compactedByTool[toolName] ?? 0) + 1;
    return cloneCompactedToolMessage(message, summarizeToolOutput(toolName, content, chars));
  });

  const afterChars = compactedMessages.reduce((acc, m) => acc + getMessageChars(m), 0);
  const maxToolCharsAfter = compactedMessages.reduce(
    (max, message) => (isToolMessage(message) ? Math.max(max, getMessageChars(message)) : max),
    0,
  );

  return {
    messages: compactedMessages,
    stats: {
      originalCount: messages.length,
      preparedCount: compactedMessages.length,
      ...sanitized.stats,
      compactedCount,
      beforeChars,
      afterChars,
      beforeTokens: estimateTokensFromChars(beforeChars),
      afterTokens: estimateTokensFromChars(afterChars),
      compactedByTool,
      maxToolCharsAfter,
    },
  };
}

export function buildControlledMemoryMessagesUpdate(preparedMessages: any[], nextMessage: any) {
  return [
    new RemoveMessage({ id: REMOVE_ALL_MESSAGES }),
    ...preparedMessages,
    nextMessage,
  ];
}

export function getControlledMemoryMetadata(stats: ControlledMemoryStats) {
  return {
    controlledMemoryCompactedCount: stats.compactedCount,
    controlledMemoryDroppedDanglingToolCalls: stats.droppedDanglingAssistantToolCalls,
    controlledMemoryDroppedOrphanToolMessages: stats.droppedOrphanToolMessages,
    controlledMemoryDroppedOlderSystemMessages: stats.droppedOlderSystemMessages,
    controlledMemoryCharsBefore: stats.beforeChars,
    controlledMemoryCharsAfter: stats.afterChars,
    controlledMemoryTokensBefore: stats.beforeTokens,
    controlledMemoryTokensAfter: stats.afterTokens,
    controlledMemoryTokensSaved: Math.max(0, stats.beforeTokens - stats.afterTokens),
    controlledMemoryCompactedTools: Object.entries(stats.compactedByTool)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([toolName, count]) => `${toolName}:${count}`)
      .join(","),
    controlledMemoryMaxToolCharsAfter: stats.maxToolCharsAfter,
  };
}
