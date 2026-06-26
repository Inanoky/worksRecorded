import type { AiContextPolicy } from "@/server/ai-flows/ai-context-policy";

export type ContextLayerKind =
  | "system"
  | "user"
  | "attachments"
  | "checkpoint"
  | "tools"
  | "response";

export type ContextGarbageSeverity = "info" | "warning" | "critical";

export type ContextInspectionLayer = {
  id: string;
  kind: ContextLayerKind;
  label: string;
  source: string;
  description: string;
  chars: number;
  estimatedTokens: number;
  count?: number;
  preview?: string | null;
};

export type ContextGarbageFlag = {
  id: string;
  severity: ContextGarbageSeverity;
  label: string;
  detail: string;
};

export type BuildDashboardContextInspectionArgs = {
  threadId: string;
  policy: AiContextPolicy;
  checkpointCount: number;
  writeCount: number;
  blobCount: number;
  latestCheckpointId: string | null;
  latestCheckpointTs: string | null;
  latestMetadata: unknown;
  checkpointChars: number;
  checkpointMessageCount: number | null;
  checkpointSystemMessageCount: number | null;
  checkpointToolMessageCount: number | null;
  checkpointLargestToolMessageChars: number;
  writeBytes: number;
  largestWriteBytes: number;
  systemPrompt: string;
  now?: Date;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function compactText(value: string, maxLength = 180) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function estimateTokensFromChars(chars: number) {
  if (!Number.isFinite(chars) || chars <= 0) return 0;
  return Math.ceil(chars / 4);
}

export function getJsonCharSize(value: unknown) {
  try {
    return JSON.stringify(value ?? null).length;
  } catch {
    return String(value ?? "").length;
  }
}

export function inspectCheckpointShape(checkpoint: unknown) {
  const root = asRecord(checkpoint);
  const channelValues = asRecord(root?.channel_values);
  const messages = Array.isArray(channelValues?.messages) ? channelValues.messages : [];
  let systemMessageCount = 0;
  let toolMessageCount = 0;
  let largestToolMessageChars = 0;

  for (const message of messages) {
    const item = asRecord(message);
    const type = asString(item?.type) ?? asString(item?._type) ?? asString(item?.role);
    if (type === "system") systemMessageCount += 1;
    if (type === "tool") {
      toolMessageCount += 1;
      const content = item?.content;
      const chars = typeof content === "string" ? content.length : getJsonCharSize(content);
      largestToolMessageChars = Math.max(largestToolMessageChars, chars);
    }
  }

  return {
    chars: getJsonCharSize(checkpoint),
    messageCount: messages.length || null,
    systemMessageCount: messages.length ? systemMessageCount : null,
    toolMessageCount: messages.length ? toolMessageCount : null,
    largestToolMessageChars,
  };
}

function getMetadataPreview(metadata: unknown, key: string) {
  const record = asRecord(metadata);
  const value = asString(record?.[key]);
  return value ? compactText(value) : null;
}

function getLatestCheckpointAgeDays(value: string | null, now: Date) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}

export function buildDashboardContextInspection(args: BuildDashboardContextInspectionArgs) {
  const now = args.now ?? new Date();
  const metadata = asRecord(args.latestMetadata);
  const promptChars = asNumber(metadata?.promptChars) ?? 0;
  const attachmentCount = asNumber(metadata?.attachmentCount) ?? 0;
  const nativeAttachmentCount = asNumber(metadata?.nativeAttachmentCount) ?? 0;
  const questionPreview = getMetadataPreview(args.latestMetadata, "questionPreview");
  const latestCheckpointAgeDays = getLatestCheckpointAgeDays(args.latestCheckpointTs, now);
  const controlledTokensSaved = asNumber(metadata?.controlledMemoryTokensSaved) ?? 0;
  const controlledCompactedCount = asNumber(metadata?.controlledMemoryCompactedCount) ?? 0;
  const controlledCompactedTools = asString(metadata?.controlledMemoryCompactedTools) ?? "";

  const layers: ContextInspectionLayer[] = [
    {
      id: "system-prompt",
      kind: "system",
      label: "System Prompt",
      source: "orchestrating-agent-v2/prompts.ts",
      description: "Base dashboard instructions, routing policy, site ID, user ID, and date.",
      chars: args.systemPrompt.length,
      estimatedTokens: estimateTokensFromChars(args.systemPrompt.length),
      preview: compactText(args.systemPrompt),
    },
    {
      id: "current-user-prompt",
      kind: "user",
      label: "Latest User Prompt",
      source: "/api/ai/chat composePrompt",
      description: "Latest composed dashboard prompt metadata from LangSmith/checkpoint metadata.",
      chars: promptChars,
      estimatedTokens: estimateTokensFromChars(promptChars),
      preview: questionPreview,
    },
    {
      id: "attachment-context",
      kind: "attachments",
      label: "Attachment Context",
      source: "/api/ai/chat attachments",
      description: "Extracted attachment text and native file context included in the composed prompt.",
      chars: Math.max(promptChars - (questionPreview?.length ?? 0), 0),
      estimatedTokens: estimateTokensFromChars(Math.max(promptChars - (questionPreview?.length ?? 0), 0)),
      count: attachmentCount,
      preview:
        attachmentCount > 0
          ? `${attachmentCount} attachment(s), ${nativeAttachmentCount} native file context item(s)`
          : "No attachment metadata on latest run",
    },
    {
      id: "checkpoint-memory",
      kind: "checkpoint",
      label: "Checkpoint Memory",
      source: "LangGraph Postgres checkpointer",
      description: "Persisted dashboard conversation state for this thread.",
      chars: args.checkpointChars,
      estimatedTokens: estimateTokensFromChars(args.checkpointChars),
      count: args.checkpointMessageCount ?? args.checkpointCount,
      preview: args.latestCheckpointId
        ? `Latest checkpoint ${args.latestCheckpointId}`
        : "No checkpoint memory stored yet",
    },
    {
      id: "tool-writes",
      kind: "tools",
      label: "Tool Outputs / Writes",
      source: "checkpoint_writes",
      description: "Serialized graph writes, usually model/tool outputs captured during execution.",
      chars: args.writeBytes,
      estimatedTokens: estimateTokensFromChars(args.writeBytes),
      count: args.writeCount,
      preview: `${args.writeCount} write(s), largest ${args.largestWriteBytes} byte(s)`,
    },
    {
      id: "response-metadata",
      kind: "response",
      label: "Final Response Metadata",
      source: "latest checkpoint metadata",
      description: "Safe metadata attached to the most recent dashboard run.",
      chars: getJsonCharSize(args.latestMetadata),
      estimatedTokens: estimateTokensFromChars(getJsonCharSize(args.latestMetadata)),
      preview: args.latestMetadata ? compactText(JSON.stringify(args.latestMetadata)) : "No metadata stored yet",
    },
  ];

  const flags: ContextGarbageFlag[] = [];

  if ((args.checkpointSystemMessageCount ?? 0) > 1) {
    flags.push({
      id: "repeated-system-prompt",
      severity: "warning",
      label: "Repeated system prompt",
      detail: `Checkpoint history appears to contain ${args.checkpointSystemMessageCount} system messages.`,
    });
  }

  if (promptChars >= 12_000 || attachmentCount > 0 && layers[2].chars >= 8_000) {
    flags.push({
      id: "large-attachment-context",
      severity: promptChars >= 24_000 ? "critical" : "warning",
      label: "Large composed prompt",
      detail: "The latest composed prompt is large. Attachment text or native file context may dominate the run.",
    });
  }

  if (args.largestWriteBytes >= 20_000 || args.writeBytes >= 60_000) {
    flags.push({
      id: "long-tool-output",
      severity: args.writeBytes >= 120_000 ? "critical" : "warning",
      label: "Large tool/write payload",
      detail: "Checkpoint writes contain large serialized outputs that may add noise to future runs.",
    });
  }

  if (args.checkpointLargestToolMessageChars >= 20_000) {
    flags.push({
      id: "raw-tool-payload-in-checkpoint",
      severity: args.checkpointLargestToolMessageChars >= 60_000 ? "critical" : "warning",
      label: "Large raw tool payload still stored",
      detail: `Largest stored tool message is about ${args.checkpointLargestToolMessageChars} character(s). It should shrink after this thread runs through controlled memory.`,
    });
  }

  if (latestCheckpointAgeDays !== null && latestCheckpointAgeDays >= 14 && args.checkpointCount > 0) {
    flags.push({
      id: "stale-checkpoint-memory",
      severity: latestCheckpointAgeDays >= 45 ? "critical" : "warning",
      label: "Stale checkpoint memory",
      detail: `Latest checkpoint is about ${latestCheckpointAgeDays} day(s) old.`,
    });
  }

  if ((args.checkpointToolMessageCount ?? 0) >= 8) {
    flags.push({
      id: "many-tool-messages",
      severity: "info",
      label: "Many tool messages",
      detail: `Checkpoint history appears to contain ${args.checkpointToolMessageCount} tool message(s).`,
    });
  }

  if (args.checkpointCount === 0 && args.writeCount === 0 && args.blobCount === 0) {
    flags.push({
      id: "empty-thread",
      severity: "info",
      label: "Nothing to inspect yet",
      detail: "This thread has no checkpoint memory. Run the dashboard chat first to populate it.",
    });
  }

  return {
    threadId: args.threadId,
    flowName: args.policy.flow,
    policy: args.policy,
    latestCheckpointId: args.latestCheckpointId,
    latestCheckpointTs: args.latestCheckpointTs,
    latestCheckpointAgeDays,
    checkpointCount: args.checkpointCount,
    writeCount: args.writeCount,
    blobCount: args.blobCount,
    layers,
    flags,
    controlledMemory: {
      compactedCount: controlledCompactedCount,
      tokensSaved: controlledTokensSaved,
      compactedTools: controlledCompactedTools
        ? controlledCompactedTools.split(",").filter(Boolean)
        : [],
      storedLargestToolMessageChars: args.checkpointLargestToolMessageChars,
      hasLargeRawStoredToolPayload: args.checkpointLargestToolMessageChars >= 20_000,
    },
    totals: {
      chars: layers.reduce((total, layer) => total + layer.chars, 0),
      estimatedTokens: layers.reduce((total, layer) => total + layer.estimatedTokens, 0),
    },
  };
}
