import {
  estimateTokensFromChars,
  prepareControlledModelMessages,
  type ControlledMemoryStats,
} from "@/server/ai-flows/controlled-memory";

export type CheckpointInspectionStatus = "pass" | "warn" | "fail";

export type SiteManagerCheckpointInspectionExpectation = {
  threadSource: "site-manager-selector";
  profile: "whatsapp-legacy";
  maxCompactedEstimatedTokens: number;
  missingHistoryBehavior: "warn" | "fail";
};

export type SiteManagerCheckpointInspectionResult = {
  status: CheckpointInspectionStatus;
  message: string;
  originalMessageCount: number;
  originalChars: number;
  originalEstimatedTokens: number;
  compactedMessageCount: number;
  compactedChars: number;
  compactedEstimatedTokens: number;
  controlledMemoryStats: ControlledMemoryStats | null;
  historicalTokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
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

function getMessagesChars(messages: any[]) {
  return messages.reduce((total, message) => total + getMessageContentString(message).length, 0);
}

function getHistoricalTokenUsage(messages: any[]) {
  return messages.reduce(
    (total, message) => {
      const serialized = asRecord(message)?.kwargs;
      const usage = asRecord(asRecord(message)?.usage_metadata) ?? asRecord(asRecord(serialized)?.usage_metadata);
      const input = typeof usage?.input_tokens === "number" ? usage.input_tokens : 0;
      const output = typeof usage?.output_tokens === "number" ? usage.output_tokens : 0;
      const itemTotal = typeof usage?.total_tokens === "number" ? usage.total_tokens : input + output;
      return {
        inputTokens: total.inputTokens + input,
        outputTokens: total.outputTokens + output,
        totalTokens: total.totalTokens + itemTotal,
      };
    },
    { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  );
}

export function extractCheckpointMessages(checkpoint: unknown) {
  const root = asRecord(checkpoint);
  const channelValues = asRecord(root?.channel_values);
  const directMessages = Array.isArray(channelValues?.messages) ? channelValues.messages : [];
  if (directMessages.length) return normalizeCheckpointMessages(directMessages);

  // Older production checkpoints can contain serialized RemoveMessage values that
  // current LangChain versions cannot hydrate. Controlled-memory writes contain the
  // complete sanitized replacement history, so reconstruct that history without
  // invoking LangChain's incompatible reviver.
  const metadata = asRecord(root?.metadata);
  const writes = asRecord(metadata?.writes);
  if (!writes) return [];
  for (const write of Object.values(writes)) {
    const messages = asRecord(write)?.messages;
    if (Array.isArray(messages)) return normalizeCheckpointMessages(messages);
  }
  return [];
}

function normalizeCheckpointMessages(messages: unknown[]) {
  return messages.flatMap((message) => {
    const item = asRecord(message);
    if (!item) return [];
    const kwargs = asRecord(item.kwargs);
    const identifier = Array.isArray(item.id) ? item.id : [];
    const className = typeof identifier.at(-1) === "string" ? String(identifier.at(-1)) : "";
    const messageId = typeof kwargs?.id === "string" ? kwargs.id : "";
    if (className === "d" || messageId === "__remove_all__") return [];
    if (!kwargs || item.type !== "constructor") return [message];

    const type = className === "SystemMessage"
      ? "system"
      : className === "HumanMessage"
        ? "human"
        : className === "AIMessage"
          ? "ai"
          : className === "ToolMessage"
            ? "tool"
            : "";
    if (!type) return [];
    return [{
      ...kwargs,
      type,
      content: kwargs.content ?? "",
      usage_metadata: kwargs.usage_metadata,
      tool_calls: kwargs.tool_calls,
      tool_call_id: kwargs.tool_call_id,
      name: kwargs.name,
    }];
  });
}

export function evaluateSiteManagerCheckpointInspection(args: {
  checkpoint: unknown;
  expectation: SiteManagerCheckpointInspectionExpectation;
}) : SiteManagerCheckpointInspectionResult {
  const originalMessages = extractCheckpointMessages(args.checkpoint);
  if (originalMessages.length === 0) {
    const status = args.expectation.missingHistoryBehavior === "fail" ? "fail" : "warn";
    return {
      status,
      message: "No persisted checkpoint history found for the selected site-manager thread.",
      originalMessageCount: 0,
      originalChars: 0,
      originalEstimatedTokens: 0,
      compactedMessageCount: 0,
      compactedChars: 0,
      compactedEstimatedTokens: 0,
      controlledMemoryStats: null,
      historicalTokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }

  const originalChars = getMessagesChars(originalMessages);
  const originalEstimatedTokens = estimateTokensFromChars(originalChars);
  const compacted = prepareControlledModelMessages(originalMessages, {
    profile: args.expectation.profile,
  });
  const compactedChars = getMessagesChars(compacted.messages);
  const compactedEstimatedTokens = estimateTokensFromChars(compactedChars);
  const status = compactedEstimatedTokens > args.expectation.maxCompactedEstimatedTokens ? "fail" : "pass";
  const historicalTokenUsage = getHistoricalTokenUsage(originalMessages);

  return {
    status,
    message:
      status === "fail"
        ? `Compacted context is too large: ${compactedEstimatedTokens} estimated tokens exceeds ${args.expectation.maxCompactedEstimatedTokens}.`
        : `Compacted context is within budget: ${compactedEstimatedTokens}/${args.expectation.maxCompactedEstimatedTokens} estimated tokens.`,
    originalMessageCount: originalMessages.length,
    originalChars,
    originalEstimatedTokens,
    compactedMessageCount: compacted.messages.length,
    compactedChars,
    compactedEstimatedTokens,
    controlledMemoryStats: compacted.stats,
    historicalTokenUsage,
  };
}
