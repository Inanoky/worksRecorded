type ToolCallShape = { id?: string | null; function?: { id?: string | null } };

type SanitizationStats = {
  droppedDanglingAssistantToolCalls: number;
  droppedOrphanToolMessages: number;
  droppedOlderSystemMessages: number;
};

type SanitizationResult = {
  messages: any[];
  stats: SanitizationStats;
};

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function getMessageType(message: any): string {
  if (!message || typeof message !== "object") return "";
  if (typeof (message as any).getType === "function") {
    try {
      return (message as any).getType();
    } catch {
      return "";
    }
  }
  return (message as any)._getType?.() ?? "";
}

function isSystemMessage(message: any): boolean {
  return getMessageType(message) === "system";
}

function isToolMessage(message: any): boolean {
  if (getMessageType(message) === "tool") return true;
  const directId = (message as any)?.tool_call_id;
  const kwargsId = (message as any)?.additional_kwargs?.tool_call_id;
  return typeof directId === "string" || typeof kwargsId === "string";
}

function getToolCalls(message: any): ToolCallShape[] {
  if (!message || typeof message !== "object") return [];

  const directCalls = asArray<ToolCallShape>((message as any).tool_calls);
  if (directCalls.length) return directCalls;

  const additionalKwargsCalls = asArray<ToolCallShape>((message as any).additional_kwargs?.tool_calls);
  return additionalKwargsCalls;
}

function getToolCallIdFromCall(toolCall: ToolCallShape): string | null {
  const maybeId = toolCall?.id ?? toolCall?.function?.id;
  return typeof maybeId === "string" && maybeId.length > 0 ? maybeId : null;
}

function getToolCallIdFromMessage(message: any): string | null {
  const directId = (message as any)?.tool_call_id;
  if (typeof directId === "string" && directId.length > 0) return directId;

  const kwargsId = (message as any)?.additional_kwargs?.tool_call_id;
  if (typeof kwargsId === "string" && kwargsId.length > 0) return kwargsId;

  return null;
}

/**
 * Removes invalid tool-call chains from persisted history.
 *
 * Why drop instead of synthesize?
 * - Injected fake tool outputs can pollute business logic and audit trails.
 * - Dropping incomplete assistant tool-call turns keeps history valid without inventing side effects.
 */
export function sanitizeCheckpointHistory(messages: any[]): SanitizationResult {
  const sanitized: any[] = [];
  const stats: SanitizationStats = {
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
      if (contiguousToolMessages.length > 0) {
        stats.droppedOrphanToolMessages += contiguousToolMessages.length;
      }
    }

    i = j;
  }

  return { messages: sanitized, stats };
}

// Backward-compatible export name used by existing agents.
export function repairInterruptedToolCalls(messages: any[]) {
  return sanitizeCheckpointHistory(messages).messages;
}
