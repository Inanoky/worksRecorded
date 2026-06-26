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
  evalRecordMetadata?: Record<string, unknown>;
  model?: string;
};

export type WorkerAgentRunContext = WorkerAgentRunOptions & {
  details: WorkerAgentRunDetails | null;
};

const workerAgentRunStorage = new AsyncLocalStorage<WorkerAgentRunContext>();

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
