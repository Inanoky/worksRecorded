import { normalizeEvalReport } from "./report-loader";

describe("AI eval report normalizer", () => {
  it("normalizes worker reports and does not flag redacted clock-in card output", () => {
    const run = normalizeEvalReport(
      {
        runId: "worker-run",
        flow: "whatsapp-worker",
        model: "gpt-5.4",
        startedAt: "2026-06-25T21:59:24.801Z",
        summary: {
          cases: 1,
          deterministicFailures: 0,
        },
        latency: {
          averageMs: 2000,
        },
        results: [
          {
            caseId: "worker-clock-in-card",
            inputPreview: "clock in",
            answer: "",
            actualModel: "gpt-5.4-2026-03-05",
            tokenUsage: { total_tokens: 769 },
            finishReason: "tool_calls",
            latencyMs: 2769,
            graphMessages: [
              {
                url: "https://graph.facebook.com/v18.0/eval-worker-business-phone-2026-06-25T21-59-23-941Z/messages",
                body: {
                  to: "[redacted]",
                  type: "interactive",
                  interactive: {
                    type: "cta_url",
                    header: { text: "Clock in" },
                    body: { text: "Tap to clock in." },
                    action: {
                      name: "cta_url",
                      parameters: {
                        url: "https://example.test/clock-in?token=[redacted]",
                      },
                    },
                  },
                },
              },
            ],
            deterministic: {
              status: "pass",
              results: [],
            },
          },
        ],
      },
      "whatsapp-worker.json",
    );

    expect(run.status).toBe("pass");
    expect(run.items[0].outboundMessages.join("\n")).toContain("Clock in");
    expect(run.items[0].anomalies).toEqual([]);
  });

  it("flags unredacted tokens and phone-like strings in artifacts", () => {
    const run = normalizeEvalReport({
      runId: "worker-run",
      flow: "whatsapp-worker",
      summary: {},
      latency: { averageMs: 1000 },
      results: [
        {
          caseId: "worker-clock-in-card",
          answer: "",
          actualModel: "gpt-5.4-2026-03-05",
          tokenUsage: { total_tokens: 10 },
          finishReason: "tool_calls",
          graphMessages: [
            {
              body: {
                to: "37129391891",
                interactive: {
                  type: "cta_url",
                  action: {
                    parameters: {
                      url: "https://example.test/clock-in?token=abcdefghijklmnopqrstuvwxyz",
                    },
                  },
                },
              },
            },
          ],
          deterministic: { status: "pass", results: [] },
        },
      ],
    });

    expect(run.items[0].anomalies.map((item) => item.code)).toContain("sensitive-output");
    expect(run.anomalies.map((item) => item.code)).toContain("sensitive-output");
  });

  it("flags unsafe save confirmations in read-only dashboard responses", () => {
    const run = normalizeEvalReport({
      runId: "dashboard-run",
      flow: "dashboard-chat",
      summary: {
        turns: 1,
        deterministicFailures: 0,
      },
      latency: { averageMs: 1000 },
      results: [
        {
          caseId: "read-only-site-diary",
          turnIndex: 0,
          promptPreview: "Read-only check. Do not create or save anything.",
          answer: "Saved successfully.",
          actualModel: "gpt-test",
          finishReason: "stop",
          deterministic: { status: "pass", results: [] },
        },
      ],
    });

    expect(run.items[0].anomalies.map((item) => item.code)).toContain("unsafe-readonly-confirmation");
  });

  it("normalizes the AI judge explanation and suggested improvements", () => {
    const run = normalizeEvalReport({
      runId: "judged-run",
      flow: "whatsapp-site-manager",
      summary: { judgeWarnings: 1 },
      latency: {},
      results: [
        {
          caseId: "judged-case",
          deterministic: { status: "pass", results: [] },
          judge: {
            status: "warn",
            explanation: "The saved record is mostly correct but the comment is vague.",
            improvements: ["Mention the reported location in the comment."],
          },
        },
      ],
    });

    expect(run.items[0]).toMatchObject({
      judgeStatus: "warn",
      judgeExplanation: "The saved record is mostly correct but the comment is vague.",
      judgeImprovements: ["Mention the reported location in the comment."],
    });
    expect(run.status).toBe("warn");
  });

  it("flags repeated answers and unexpected finish reasons", () => {
    const run = normalizeEvalReport({
      runId: "dashboard-run",
      flow: "dashboard-chat",
      summary: {},
      latency: { averageMs: 1000 },
      results: [
        {
          caseId: "case-a",
          answer: "Same answer",
          actualModel: "gpt-test",
          finishReason: "length",
          deterministic: { status: "pass", results: [] },
        },
        {
          caseId: "case-b",
          answer: "Same answer",
          actualModel: "gpt-test",
          finishReason: "stop",
          deterministic: { status: "pass", results: [] },
        },
      ],
    });

    expect(run.items[0].anomalies.map((item) => item.code)).toContain("unexpected-finish-reason");
    expect(run.items[0].anomalies.map((item) => item.code)).toContain("repeated-answer");
    expect(run.items[1].anomalies.map((item) => item.code)).toContain("repeated-answer");
  });

  it("promotes checkpoint inspection status, context tokens, and failed validators", () => {
    const run = normalizeEvalReport({
      runId: "checkpoint-run",
      flow: "whatsapp-site-manager",
      summary: { controlledMemoryFailures: 1 },
      latency: {},
      results: [
        {
          caseId: "legacy-history-selector-sanitizes-production-thread",
          aggregateTokenUsage: { inputTokens: 1200, outputTokens: 80, totalTokens: 1280 },
          controlledMemory: {
            status: "fail",
            message: "Compacted context exceeds its token budget.",
            checks: [],
            originalEstimatedTokens: 9000,
            compactedEstimatedTokens: 3500,
          },
          deterministic: null,
        },
      ],
    });

    expect(run.items[0]).toMatchObject({
      status: "fail",
      tokenInput: 1200,
      tokenOutput: 80,
      tokenTotal: 1280,
      contextTokens: { original: 9000, compacted: 3500, saved: 5500 },
      failedValidators: [
        {
          name: "controlled-memory",
          status: "fail",
          message: "Compacted context exceeds its token budget.",
        },
      ],
    });
    expect(run.status).toBe("fail");
  });

  it("retains only failed deterministic checks in the promoted validator list", () => {
    const run = normalizeEvalReport({
      flow: "dashboard-chat",
      results: [{
        caseId: "validator-case",
        deterministic: {
          status: "fail",
          results: [
            { name: "required-any", status: "fail", message: "Missing evidence." },
            { name: "language:en", status: "pass", message: "English detected." },
          ],
        },
      }],
    });

    expect(run.items[0].failedValidators).toEqual([
      { name: "required-any", status: "fail", message: "Missing evidence." },
    ]);
  });
});
