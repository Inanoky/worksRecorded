import {
  buildDashboardContextInspection,
  estimateTokensFromChars,
  inspectCheckpointShape,
} from "./ai-context-inspection";
import { getAiContextPolicy } from "./ai-context-policy";

describe("AI context inspection helpers", () => {
  it("estimates tokens from character count", () => {
    expect(estimateTokensFromChars(0)).toBe(0);
    expect(estimateTokensFromChars(1)).toBe(1);
    expect(estimateTokensFromChars(16)).toBe(4);
    expect(estimateTokensFromChars(17)).toBe(5);
  });

  it("inspects checkpoint shape without exposing raw message content", () => {
    const result = inspectCheckpointShape({
      channel_values: {
        messages: [
          { type: "system", content: "secret system prompt" },
          { type: "human", content: "private user text" },
          { type: "tool", content: "large tool output" },
        ],
      },
    });

    expect(result.messageCount).toBe(3);
    expect(result.systemMessageCount).toBe(1);
    expect(result.toolMessageCount).toBe(1);
    expect(result.largestToolMessageChars).toBe("large tool output".length);
    expect(result.chars).toBeGreaterThan(0);
  });

  it("flags stale memory, repeated system prompts, and oversized context", () => {
    const inspection = buildDashboardContextInspection({
      threadId: "orchestrating-agent-v2:site-1:user-1",
      policy: getAiContextPolicy("dashboard-chat"),
      checkpointCount: 3,
      writeCount: 4,
      blobCount: 2,
      latestCheckpointId: "checkpoint-1",
      latestCheckpointTs: "2026-01-01T00:00:00.000Z",
      latestMetadata: {
        questionPreview: "What happened today?",
        promptChars: 25_000,
        attachmentCount: 1,
        nativeAttachmentCount: 1,
        controlledMemoryTokensSaved: 12_000,
        controlledMemoryCompactedCount: 3,
        controlledMemoryCompactedTools: "siteDiaryRecordsTool:2,timeSheetsTool:1",
      },
      checkpointChars: 40_000,
      checkpointMessageCount: 18,
      checkpointSystemMessageCount: 2,
      checkpointToolMessageCount: 9,
      checkpointLargestToolMessageChars: 65_000,
      writeBytes: 125_000,
      largestWriteBytes: 25_000,
      systemPrompt: "system prompt",
      now: new Date("2026-06-26T00:00:00.000Z"),
    });

    expect(inspection.flags.map((flag) => flag.id)).toEqual(
      expect.arrayContaining([
        "repeated-system-prompt",
        "large-attachment-context",
        "long-tool-output",
        "stale-checkpoint-memory",
        "many-tool-messages",
        "raw-tool-payload-in-checkpoint",
      ]),
    );
    expect(inspection.controlledMemory.tokensSaved).toBe(12_000);
    expect(inspection.controlledMemory.compactedTools).toEqual([
      "siteDiaryRecordsTool:2",
      "timeSheetsTool:1",
    ]);
    expect(JSON.stringify(inspection)).not.toContain("private user text");
  });

  it("explains empty dashboard threads", () => {
    const inspection = buildDashboardContextInspection({
      threadId: "orchestrating-agent-v2:site-1:user-1",
      policy: getAiContextPolicy("dashboard-chat"),
      checkpointCount: 0,
      writeCount: 0,
      blobCount: 0,
      latestCheckpointId: null,
      latestCheckpointTs: null,
      latestMetadata: null,
      checkpointChars: 0,
      checkpointMessageCount: null,
      checkpointSystemMessageCount: null,
      checkpointToolMessageCount: null,
      checkpointLargestToolMessageChars: 0,
      writeBytes: 0,
      largestWriteBytes: 0,
      systemPrompt: "system prompt",
      now: new Date("2026-06-26T00:00:00.000Z"),
    });

    expect(inspection.flags).toEqual([
      expect.objectContaining({
        id: "empty-thread",
        severity: "info",
      }),
    ]);
  });
});
