import type { RunnableConfig } from "@langchain/core/runnables";

export const AI_FLOW_NAMES = [
  "dashboard-chat",
  "whatsapp-site-manager",
  "whatsapp-worker",
  "structured-site-diary-save",
  "structured-worker-diary-save",
  "site-diary-agent",
  "timesheets-agent",
  "bis-materials-agent",
] as const;

export type AiFlowName = (typeof AI_FLOW_NAMES)[number];

type MetadataValue = string | number | boolean | null | undefined;

type BuildAiRunContextArgs = {
  flow: AiFlowName;
  threadId: string;
  runName?: string;
  siteId?: string | null;
  userId?: string | null;
  workerId?: string | null;
  channel?: "dashboard" | "whatsapp" | "tool" | "agent";
  model?: string | null;
  metadata?: Record<string, MetadataValue>;
  tags?: string[];
  parentConfig?: RunnableConfig;
};

const FLOW_RUN_NAMES: Record<AiFlowName, string> = {
  "dashboard-chat": "OrchestratingAgentV2",
  "whatsapp-site-manager": "WhatsAppSiteManagerAgent",
  "whatsapp-worker": "WhatsAppWorkerAgent",
  "structured-site-diary-save": "SiteDiaryStructuredSave",
  "structured-worker-diary-save": "WorkerDiaryStructuredSave",
  "site-diary-agent": "SiteDiaryAgent",
  "timesheets-agent": "TimesheetsAgent",
  "bis-materials-agent": "BisMaterialsAgent",
};

function cleanTag(value: string) {
  return value.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9:._-]/g, "_");
}

function compactMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  );
}

export function summarizeForTrace(value: string | null | undefined, maxLength = 240) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function getOrchestratingThreadId(siteId: string | null | undefined, userId: string) {
  return `orchestrating-agent-v2:${siteId ?? "no-site"}:${userId}`;
}

export function getSiteManagerThreadId(siteId: string | null | undefined, userId: string) {
  return `siteManager:${siteId ?? "no-site"}:${userId}`;
}

export function getWorkerThreadId(workerId: string) {
  return workerId;
}

export function getSiteDiaryAgentThreadId(siteId: string) {
  return `${siteId}_SiteDiaryAgent`;
}

export function getTimesheetsAgentThreadId(siteId: string) {
  return `${siteId}_Timesheets-agent`;
}

export function getBisMaterialsAgentThreadId(siteId: string) {
  return `${siteId}_BisMaterialsAgent`;
}

export function buildAiRunContext(args: BuildAiRunContextArgs) {
  const runName = args.runName ?? FLOW_RUN_NAMES[args.flow];
  const tags = [...new Set([
    ...(args.parentConfig?.tags ?? []),
    "works-recorded",
    `flow:${args.flow}`,
    args.channel ? `channel:${args.channel}` : null,
    args.siteId ? `site:${args.siteId}` : null,
    args.userId ? `user:${args.userId}` : null,
    args.workerId ? `worker:${args.workerId}` : null,
    ...(args.tags ?? []),
  ]
    .filter((tag): tag is string => Boolean(tag))
    .map(cleanTag))];

  const metadata = compactMetadata({
    ...(args.parentConfig?.metadata ?? {}),
    app: "works-recorded",
    flow: args.flow,
    channel: args.channel,
    threadId: args.threadId,
    siteId: args.siteId ?? null,
    userId: args.userId ?? null,
    workerId: args.workerId ?? null,
    model: args.model ?? null,
    ...args.metadata,
  });

  return {
    runName,
    threadId: args.threadId,
    tags,
    metadata,
    runnableConfig: {
      ...(args.parentConfig ?? {}),
      runName,
      tags,
      metadata,
    },
  };
}
