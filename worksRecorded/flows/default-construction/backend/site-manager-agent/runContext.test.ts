import {
  getSiteManagerMetricsSnapshot,
  recordSiteManagerModelCall,
  recordSiteManagerTiming,
  recordSiteManagerToolCall,
  runWithSiteManagerAgentEvalContext,
  setSiteManagerExecutionPath,
} from "./runContext";

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
