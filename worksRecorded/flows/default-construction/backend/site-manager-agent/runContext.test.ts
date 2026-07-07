import {
  fastPathTraceConfig,
  getSiteManagerMetricsSnapshot,
  recordSiteManagerModelCall,
  recordSiteManagerTiming,
  recordSiteManagerToolCall,
  runWithSiteManagerAgentEvalContext,
  setSiteManagerExecutionPath,
} from "./runContext";
import { buildAiRunContext } from "@/server/ai-flows/ai-run-context";

describe("site-manager run metrics", () => {
  it("aggregates nested calls, tools, timings, and execution path", async () => {
    const run = await runWithSiteManagerAgentEvalContext({}, async () => {
      setSiteManagerExecutionPath("fast-path", "on");
      recordSiteManagerTiming("totalMs", 120);
      recordSiteManagerModelCall({
        purpose: "fast-path-extraction",
        model: "gpt-5.4",
        actualModel: "gpt-5.4-test",
        durationMs: 100,
        inputTokens: 20,
        outputTokens: 5,
        totalTokens: 25,
      });
      recordSiteManagerToolCall({ name: "save_to_database", durationMs: 20, ok: true });
      return getSiteManagerMetricsSnapshot();
    });

    expect(run.result).toMatchObject({
      executionPath: "fast-path",
      fastPathMode: "on",
      timings: { totalMs: 120 },
      aggregateTokenUsage: { inputTokens: 20, outputTokens: 5, totalTokens: 25 },
    });
    expect(run.result.modelCalls).toHaveLength(1);
    expect(run.result.toolCalls).toHaveLength(1);
  });
});

describe("site-manager fast-path trace metadata", () => {
  it.each([
    {
      name: "eligible direct save",
      metadata: {
        fastPathMode: "on" as const,
        fastPathCandidate: true,
        executionPath: "fast-path" as const,
        fastPathAttempted: true,
        fastPathOutcome: "save" as const,
      },
      tag: "execution-path:fast-path",
    },
    {
      name: "ineligible or ambiguous legacy execution",
      metadata: {
        fastPathMode: "on" as const,
        fastPathCandidate: false,
        executionPath: "legacy-agent" as const,
        fastPathAttempted: false,
        fastPathOutcome: "skipped" as const,
        fallbackReason: "ineligible" as const,
      },
      tag: "execution-path:legacy-agent",
    },
    {
      name: "attempt followed by legacy fallback",
      metadata: {
        fastPathMode: "on" as const,
        fastPathCandidate: true,
        executionPath: "legacy-agent" as const,
        fastPathAttempted: true,
        fastPathOutcome: "fallback" as const,
        fallbackReason: "model-fallback" as const,
      },
      tag: "execution-path:legacy-agent",
    },
    {
      name: "shadow extraction without user-facing fast-path execution",
      metadata: {
        fastPathMode: "shadow" as const,
        fastPathCandidate: true,
        executionPath: "legacy-agent" as const,
        fastPathAttempted: true,
        fastPathOutcome: "save" as const,
      },
      tag: "execution-path:legacy-agent",
    },
  ])("builds canonical metadata for $name", ({ metadata, tag }) => {
    expect(fastPathTraceConfig(metadata)).toEqual({
      metadata,
      tags: [tag],
    });
  });

  it("preserves existing caller metadata and tags", () => {
    const trace = fastPathTraceConfig({
      fastPathMode: "on",
      fastPathCandidate: true,
      executionPath: "fast-path",
      fastPathAttempted: true,
      fastPathOutcome: "save",
    });
    const context = buildAiRunContext({
      flow: "whatsapp-site-manager",
      threadId: "thread-1",
      metadata: { evalRunId: "run-1", ...trace.metadata },
      tags: ["eval:whatsapp-site-manager", ...trace.tags],
    });

    expect(context.metadata).toMatchObject({
      evalRunId: "run-1",
      executionPath: "fast-path",
      fastPathOutcome: "save",
    });
    expect(context.tags).toEqual(expect.arrayContaining([
      "eval:whatsapp-site-manager",
      "execution-path:fast-path",
    ]));
  });
});
