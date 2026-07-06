import { AsyncLocalStorage } from "node:async_hooks";

export type SiteManagerAgentRunDetails = {
  content: string;
  requestedModel: string;
  actualModel: string | null;
  tokenUsage: unknown;
  usageMetadata: unknown;
  responseMetadata: unknown;
  finishReason: string | null;
};

export type SiteManagerAgentRunOptions = {
  threadId?: string;
  traceMetadata?: Record<string, string | number | boolean | null | undefined>;
  traceTags?: string[];
  evalRecordMetadata?: Record<string, unknown>;
  model?: string;
};

export type SiteManagerAgentRunContext = SiteManagerAgentRunOptions & {
  details: SiteManagerAgentRunDetails | null;
};

const siteManagerAgentRunStorage = new AsyncLocalStorage<SiteManagerAgentRunContext>();

export async function runWithSiteManagerAgentEvalContext<T>(
  options: SiteManagerAgentRunOptions,
  fn: () => Promise<T>,
) {
  const context: SiteManagerAgentRunContext = {
    ...options,
    details: null,
  };

  const result = await siteManagerAgentRunStorage.run(context, fn);
  return {
    result,
    details: context.details,
  };
}

export function getSiteManagerAgentRunContext() {
  return siteManagerAgentRunStorage.getStore();
}
