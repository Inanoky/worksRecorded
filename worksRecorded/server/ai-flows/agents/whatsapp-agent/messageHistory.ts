import { ToolMessage } from "@langchain/core/messages";

const FALLBACK_TOOL_RESPONSE = JSON.stringify({
  ok: false,
  error: "Tool response missing due to an interrupted run. Continue safely.",
});

function getToolCalls(message: any): Array<{ id?: string }> {
  if (!message || typeof message !== "object") return [];
  const calls = (message as any).tool_calls;
  return Array.isArray(calls) ? calls : [];
}

function getToolCallId(message: any): string | null {
  if (!message || typeof message !== "object") return null;
  const id = (message as any).tool_call_id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/**
 * Ensures the chat history always satisfies the tool-call invariant expected by OpenAI:
 * every assistant message containing tool_calls must be followed by matching tool messages.
 */
export function repairInterruptedToolCalls(messages: any[]) {
  const repaired: any[] = [];

  let i = 0;
  while (i < messages.length) {
    const current = messages[i];

    // Skip orphan tool messages that do not directly follow an assistant tool call.
    if (getToolCallId(current)) {
      i += 1;
      continue;
    }

    const toolCalls = getToolCalls(current);
    repaired.push(current);

    if (!toolCalls.length) {
      i += 1;
      continue;
    }

    const respondedIds = new Set<string>();
    let j = i + 1;

    while (j < messages.length) {
      const maybeToolMessage = messages[j];
      const toolCallId = getToolCallId(maybeToolMessage);
      if (!toolCallId) break;

      respondedIds.add(toolCallId);
      repaired.push(maybeToolMessage);
      j += 1;
    }

    for (const toolCall of toolCalls) {
      if (!toolCall?.id || respondedIds.has(toolCall.id)) continue;
      repaired.push(
        new ToolMessage({
          tool_call_id: toolCall.id,
          content: FALLBACK_TOOL_RESPONSE,
        })
      );
    }

    i = j;
  }

  return repaired;
}
