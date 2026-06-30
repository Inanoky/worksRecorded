import {
  buildAiRunContext,
  getBisMaterialsAgentThreadId,
  getOrchestratingThreadId,
  getSiteDiaryAgentThreadId,
  getSiteManagerThreadId,
  getTimesheetsAgentThreadId,
  getWorkerThreadId,
  summarizeForTrace,
} from "./ai-run-context";

describe("AI run context helpers", () => {
  it("builds stable checkpoint thread IDs for the main workflows", () => {
    expect(getOrchestratingThreadId("site-1", "user-1")).toBe(
      "orchestrating-agent-v2:site-1:user-1",
    );
    expect(getOrchestratingThreadId(null, "user-1")).toBe(
      "orchestrating-agent-v2:no-site:user-1",
    );
    expect(getSiteManagerThreadId("site-1", "user-1")).toBe("siteManager:site-1:user-1");
    expect(getSiteManagerThreadId(undefined, "user-1")).toBe("siteManager:no-site:user-1");
    expect(getWorkerThreadId("worker-1")).toBe("worker-1");
    expect(getSiteDiaryAgentThreadId("site-1")).toBe("site-1_SiteDiaryAgent");
    expect(getTimesheetsAgentThreadId("site-1")).toBe("site-1_Timesheets-agent");
    expect(getBisMaterialsAgentThreadId("site-1")).toBe("site-1_BisMaterialsAgent");
  });

  it("builds trace tags and metadata without undefined values", () => {
    const context = buildAiRunContext({
      flow: "dashboard-chat",
      threadId: "thread-1",
      siteId: "site 1",
      userId: "user-1",
      channel: "dashboard",
      model: "gpt-test",
      metadata: {
        kept: "yes",
        skipped: undefined,
      },
      tags: ["custom tag"],
    });

    expect(context.runName).toBe("OrchestratingAgentV2");
    expect(context.threadId).toBe("thread-1");
    expect(context.tags).toEqual([
      "works-recorded",
      "flow:dashboard-chat",
      "channel:dashboard",
      "site:site-1",
      "user:user-1",
      "custom-tag",
    ]);
    expect(context.metadata).toEqual({
      app: "works-recorded",
      flow: "dashboard-chat",
      channel: "dashboard",
      threadId: "thread-1",
      siteId: "site 1",
      userId: "user-1",
      workerId: null,
      model: "gpt-test",
      kept: "yes",
    });
    expect(context.runnableConfig).toEqual({
      runName: "OrchestratingAgentV2",
      tags: context.tags,
      metadata: context.metadata,
    });
  });

  it("summarizes text for trace metadata", () => {
    expect(summarizeForTrace("  hello\n\nworld  ")).toBe("hello world");
    expect(summarizeForTrace("abcdef", 4)).toBe("abcd...");
    expect(summarizeForTrace(null)).toBe("");
  });
});
