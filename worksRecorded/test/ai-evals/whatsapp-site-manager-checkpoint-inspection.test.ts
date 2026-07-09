import { getSiteManagerThreadId } from "@/server/ai-flows/ai-run-context";
import {
  evaluateSiteManagerCheckpointInspection,
  extractCheckpointMessages,
} from "./whatsapp-site-manager-checkpoint-inspection";

describe("WhatsApp site-manager checkpoint inspection", () => {
  const expectation = {
    threadSource: "site-manager-selector" as const,
    profile: "whatsapp-legacy" as const,
    maxCompactedEstimatedTokens: 3000,
    missingHistoryBehavior: "warn" as const,
  };

  it("resolves the production site-manager thread selector", () => {
    expect(getSiteManagerThreadId("site-1", "user-1")).toBe("siteManager:site-1:user-1");
  });

  it("extracts checkpoint messages from the persisted shape", () => {
    const result = extractCheckpointMessages({
      channel_values: {
        messages: [
          { type: "system", content: "system" },
          { type: "human", content: "hello" },
        ],
      },
    });

    expect(result).toHaveLength(2);
  });

  it("reconstructs sanitized history from legacy metadata writes and drops remove-all markers", () => {
    const result = extractCheckpointMessages({
      metadata: {
        writes: {
          agent: {
            messages: [
              {
                id: ["langchain_core", "messages", "d"],
                lc: 1,
                type: "constructor",
                kwargs: { id: "__remove_all__", content: [] },
              },
              {
                id: ["langchain_core", "messages", "HumanMessage"],
                lc: 1,
                type: "constructor",
                kwargs: { id: "human-1", content: "Kā atvērt BIS?" },
              },
              {
                id: ["langchain_core", "messages", "AIMessage"],
                lc: 1,
                type: "constructor",
                kwargs: {
                  id: "ai-1",
                  content: "Atveriet WorksRecorded iestatījumus.",
                  usage_metadata: { input_tokens: 100, output_tokens: 10, total_tokens: 110 },
                },
              },
            ],
          },
        },
      },
    });

    expect(result).toEqual([
      expect.objectContaining({ type: "human", content: "Kā atvērt BIS?" }),
      expect.objectContaining({ type: "ai", content: "Atveriet WorksRecorded iestatījumus." }),
    ]);
  });

  it("warns when no checkpoint history exists", () => {
    const result = evaluateSiteManagerCheckpointInspection({
      checkpoint: null,
      expectation,
    });

    expect(result.status).toBe("warn");
    expect(result.originalEstimatedTokens).toBe(0);
    expect(result.controlledMemoryStats).toBeNull();
  });

  it("fails when compacted estimated tokens exceed the budget", () => {
    const hugeText = "A".repeat(20_000);
    const result = evaluateSiteManagerCheckpointInspection({
      checkpoint: {
        channel_values: {
          messages: [
            { type: "system", content: "system" },
            { type: "human", content: hugeText },
            { type: "ai", content: hugeText },
            { type: "human", content: hugeText },
            { type: "ai", content: hugeText },
            { type: "human", content: hugeText },
            { type: "ai", content: hugeText },
          ],
        },
      },
      expectation,
    });

    expect(result.status).toBe("fail");
    expect(result.compactedEstimatedTokens).toBeGreaterThan(3000);
  });

  it("passes when compacted estimated tokens are within budget", () => {
    const result = evaluateSiteManagerCheckpointInspection({
      checkpoint: {
        channel_values: {
          messages: [
            { type: "system", content: "system" },
            { type: "human", content: "Kā ievadīt BIS?" },
            { type: "ai", content: "Atver WorksRecorded un pieslēdz BIS." },
            { type: "human", content: "Vai no WhatsApp var nosūtīt uz BIS?" },
            { type: "ai", content: "Nē, no WhatsApp tikai saglabā ierakstus." },
          ],
        },
      },
      expectation,
    });

    expect(result.status).toBe("pass");
    expect(result.controlledMemoryStats?.profile).toBe("whatsapp-legacy");
    expect(result.compactedEstimatedTokens).toBeLessThanOrEqual(3000);
  });

  it("aggregates model token metadata from hydrated checkpoint messages", () => {
    const result = evaluateSiteManagerCheckpointInspection({
      checkpoint: {
        channel_values: {
          messages: [
            { type: "human", content: "hello" },
            {
              type: "ai",
              content: "answer",
              usage_metadata: { input_tokens: 120, output_tokens: 15, total_tokens: 135 },
            },
            {
              type: "ai",
              content: "second answer",
              usage_metadata: { input_tokens: 160, output_tokens: 20, total_tokens: 180 },
            },
          ],
        },
      },
      expectation,
    });

    expect(result.historicalTokenUsage).toEqual({
      inputTokens: 280,
      outputTokens: 35,
      totalTokens: 315,
    });
  });
});
