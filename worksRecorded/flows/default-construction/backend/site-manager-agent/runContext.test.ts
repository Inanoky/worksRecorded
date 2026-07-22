import {
  buildSiteManagerSenderTraceContext,
  fastPathTraceConfig,
  getSiteManagerAgentRunContext,
  getSiteManagerMetricsSnapshot,
  getSiteManagerSenderTraceMetadata,
  getSiteManagerSenderTraceTags,
  recordSiteManagerModelCall,
  recordSiteManagerTiming,
  recordSiteManagerToolCall,
  runWithSiteManagerAgentEvalContext,
  setSiteManagerExecutionPath,
  setSiteManagerSenderTraceContext,
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
      name: "direct correction execution",
      metadata: {
        fastPathMode: "on" as const,
        fastPathCandidate: true,
        executionPath: "correction-path" as const,
        fastPathAttempted: true,
        fastPathOutcome: "correction" as const,
      },
      tag: "execution-path:correction-path",
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

describe("site-manager sender trace metadata", () => {
  it.each([
    {
      name: "full name",
      input: { firstName: " Anna ", lastName: " Bērziņa " },
      expected: {
        senderFirstName: "Anna",
        senderLastName: "Bērziņa",
        senderName: "Anna Bērziņa",
        senderInitials: "AB",
        senderLabel: "Anna Bērziņa",
      },
    },
    {
      name: "first name only",
      input: { firstName: "Jānis", lastName: "" },
      expected: {
        senderFirstName: "Jānis",
        senderLastName: null,
        senderName: "Jānis",
        senderInitials: "J",
        senderLabel: "Jānis",
      },
    },
    {
      name: "empty values",
      input: { firstName: " ", lastName: null },
      expected: {
        senderFirstName: null,
        senderLastName: null,
        senderName: null,
        senderInitials: null,
        senderLabel: null,
      },
    },
  ])("builds trace-safe sender labels for $name", ({ input, expected }) => {
    expect(buildSiteManagerSenderTraceContext(input)).toEqual(expected);
  });

  it("exposes sender metadata and tags from run context options", async () => {
    await runWithSiteManagerAgentEvalContext(
      {
        senderFirstName: "Anna",
        senderLastName: "Bērziņa",
        senderName: "Anna Bērziņa",
        senderInitials: "AB",
        senderLabel: "Anna Bērziņa",
      },
      async () => {
        const runContext = getSiteManagerAgentRunContext();
        const context = buildAiRunContext({
          flow: "whatsapp-site-manager",
          threadId: "thread-1",
          metadata: getSiteManagerSenderTraceMetadata(runContext),
          tags: getSiteManagerSenderTraceTags(runContext),
        });

        expect(context.metadata).toMatchObject({
          senderFirstName: "Anna",
          senderLastName: "Bērziņa",
          senderName: "Anna Bērziņa",
          senderInitials: "AB",
          senderLabel: "Anna Bērziņa",
        });
        expect(context.tags).toEqual(expect.arrayContaining(["sender:Anna-B_rzi_a"]));
      },
    );
  });

  it("adds sender fields to an existing run context without replacing caller metadata", async () => {
    await runWithSiteManagerAgentEvalContext(
      {
        traceMetadata: { evalRunId: "run-1" },
        traceTags: ["eval:whatsapp-site-manager"],
      },
      async () => {
        expect(setSiteManagerSenderTraceContext({
          senderFirstName: "Anna",
          senderLastName: "Bērziņa",
          senderName: "Anna Bērziņa",
          senderInitials: "AB",
          senderLabel: "Anna Bērziņa",
        })).toBe(true);

        expect(getSiteManagerAgentRunContext()).toEqual(
          expect.objectContaining({
            traceMetadata: { evalRunId: "run-1" },
            traceTags: ["eval:whatsapp-site-manager"],
            senderFirstName: "Anna",
            senderLastName: "Bērziņa",
            senderName: "Anna Bērziņa",
            senderInitials: "AB",
            senderLabel: "Anna Bērziņa",
          }),
        );
      },
    );
  });
});
