import { AsyncLocalStorage } from "node:async_hooks";

export type WorkerAgentRunDetails = {
  content: string;
  requestedModel: string;
  actualModel: string | null;
  tokenUsage: unknown;
  usageMetadata: unknown;
  responseMetadata: unknown;
  finishReason: string | null;
};

export type WorkerAgentRunOptions = {
  threadId?: string;
  traceMetadata?: Record<string, string | number | boolean | null | undefined>;
  traceTags?: string[];
  senderFirstName?: string | null;
  senderLastName?: string | null;
  senderName?: string | null;
  senderInitials?: string | null;
  senderLabel?: string | null;
  evalRecordMetadata?: Record<string, unknown>;
  model?: string;
};

export type WorkerAgentRunContext = WorkerAgentRunOptions & {
  details: WorkerAgentRunDetails | null;
};

const workerAgentRunStorage = new AsyncLocalStorage<WorkerAgentRunContext>();

function normalizeTraceNamePart(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function buildInitials(parts: string[]) {
  const initials = parts
    .map((part) => [...part][0])
    .filter(Boolean)
    .join("")
    .toUpperCase();
  return initials || null;
}

export function buildWorkerSenderTraceContext(args: {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
}) {
  const explicitFirstName = normalizeTraceNamePart(args.firstName);
  const explicitLastName = normalizeTraceNamePart(args.lastName);
  const fullNameParts = normalizeTraceNamePart(args.fullName).split(/\s+/u).filter(Boolean);
  const firstName = explicitFirstName || fullNameParts[0] || "";
  const lastName = explicitLastName || fullNameParts.slice(1).join(" ");
  const nameParts = [firstName, lastName].filter(Boolean);
  const senderName = nameParts.join(" ") || null;
  const senderInitials = buildInitials(nameParts);
  const senderLabel = senderName ?? senderInitials;

  return {
    senderFirstName: firstName || null,
    senderLastName: lastName || null,
    senderName,
    senderInitials,
    senderLabel,
  };
}

export function getWorkerSenderTraceMetadata(
  context: Pick<WorkerAgentRunOptions, "senderFirstName" | "senderLastName" | "senderName" | "senderInitials" | "senderLabel"> | null | undefined,
) {
  return {
    senderFirstName: context?.senderFirstName ?? undefined,
    senderLastName: context?.senderLastName ?? undefined,
    senderName: context?.senderName ?? undefined,
    senderInitials: context?.senderInitials ?? undefined,
    senderLabel: context?.senderLabel ?? undefined,
  };
}

export function getWorkerSenderTraceTags(
  context: Pick<WorkerAgentRunOptions, "senderLabel"> | null | undefined,
) {
  return context?.senderLabel ? [`sender:${context.senderLabel}`] : [];
}

export function setWorkerSenderTraceContext(
  senderContext: Pick<WorkerAgentRunOptions, "senderFirstName" | "senderLastName" | "senderName" | "senderInitials" | "senderLabel">,
) {
  const context = getWorkerAgentRunContext();
  if (!context) return false;
  context.senderFirstName = senderContext.senderFirstName;
  context.senderLastName = senderContext.senderLastName;
  context.senderName = senderContext.senderName;
  context.senderInitials = senderContext.senderInitials;
  context.senderLabel = senderContext.senderLabel;
  return true;
}

export async function runWithWorkerAgentEvalContext<T>(
  options: WorkerAgentRunOptions,
  fn: () => Promise<T>,
) {
  const context: WorkerAgentRunContext = {
    ...options,
    details: null,
  };

  const result = await workerAgentRunStorage.run(context, fn);
  return {
    result,
    details: context.details,
  };
}

export function getWorkerAgentRunContext() {
  return workerAgentRunStorage.getStore();
}
