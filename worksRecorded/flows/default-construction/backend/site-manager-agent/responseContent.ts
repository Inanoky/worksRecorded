import type { BaseMessage } from "@langchain/core/messages";

const HISTORICAL_TOOL_RESULT_PREFIX = "[HISTORICAL TOOL RESULT]";

function isAssistantMessage(message: BaseMessage): boolean {
  const candidate = message as BaseMessage & {
    getType?: () => string;
    _getType?: () => string;
  };
  const type = candidate.getType?.() ?? candidate._getType?.();
  return type === "ai";
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  return content
    .map((block) => {
      if (typeof block === "string") return block;
      if (!block || typeof block !== "object") return "";

      const record = block as Record<string, unknown>;
      return (record.type === "text" || record.type === "output_text") && typeof record.text === "string"
        ? record.text
        : "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function getFinalAssistantResponse(
  messages: readonly BaseMessage[],
): { message: BaseMessage; content: string } | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!isAssistantMessage(message)) continue;

    const content = extractTextContent(message.content);
    if (!content || content.includes(HISTORICAL_TOOL_RESULT_PREFIX)) return null;
    return { message, content };
  }

  return null;
}
