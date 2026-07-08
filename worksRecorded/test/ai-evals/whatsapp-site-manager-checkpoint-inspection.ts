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

export function extractCheckpointMessages(checkpoint: unknown) {
  const root = asRecord(checkpoint);
  const channelValues = asRecord(root?.channel_values);
  return Array.isArray(channelValues?.messages) ? channelValues.messages : [];
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
  };
}
