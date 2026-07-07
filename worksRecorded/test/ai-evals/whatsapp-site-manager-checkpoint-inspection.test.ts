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
});
