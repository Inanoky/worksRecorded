import { MemorySession } from "@openai/agents";
import { reviewProposal, reviewSnapshot } from "@/test/fixtures/diary-review";
import {
  reviewAssistantMessage as assistantMessage,
  reviewFunctionCall as functionCall,
  ScriptedReviewModel as ScriptedModel,
} from "@/test/fixtures/diary-review-model";
import { runDiaryReviewAgent } from "./diary-review-agent";

const originalClone = globalThis.structuredClone;
beforeAll(() => {
  globalThis.structuredClone = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value)) as T;
});
afterAll(() => {
  globalThis.structuredClone = originalClone;
});

function scriptedReview() {
  return new ScriptedModel([
    [functionCall("read_diary_records", {}, { callId: "records" })],
    [functionCall("read_project_guidance", {}, { callId: "guidance" })],
    [
      functionCall(
        "search_forma2_positions",
        { query: "beton", offset: 0 },
        { callId: "search" },
      ),
    ],
    [
      functionCall(
        "read_forma2_position",
        { positionId: "concrete" },
        { callId: "position" },
      ),
    ],
    [assistantMessage(JSON.stringify(reviewProposal()))],
  ]);
}

it("runs the actual SDK tools loop with structured output and session persistence without API calls", async () => {
  const model = scriptedReview();
  const progress = jest.fn().mockResolvedValue(undefined);
  const session = new MemorySession();
  const result = await runDiaryReviewAgent(
    reviewSnapshot(),
    session,
    progress,
    model,
  );
  expect(result.proposal).toEqual(reviewProposal());
  expect(result.metrics.toolCalls).toBe(4);
  expect(model.calls).toHaveLength(5);
  expect(model.firstCall?.modelSettings.store).toBe(false);
  expect(
    (await session.getItems()).filter(
      (item) => "role" in item && item.role === "user",
    ),
  ).toHaveLength(1);
  expect(progress.mock.calls.map(([name]) => name)).toEqual([
    "read_diary_records",
    "read_project_guidance",
    "search_forma2_positions",
    "read_forma2_position",
  ]);
  model.assertComplete();
});

it("does not accept a final answer that skipped the original source and project guidance", async () => {
  const model = new ScriptedModel([
    [assistantMessage(JSON.stringify(reviewProposal()))],
  ]);
  await expect(
    runDiaryReviewAgent(
      reviewSnapshot(),
      new MemorySession(),
      async () => {},
      model,
    ),
  ).rejects.toThrow("REVIEW_CONTEXT_NOT_READ");
});

it("can reach a valid estimate position beyond the old first twenty-four candidates", async () => {
  const snapshot = reviewSnapshot();
  snapshot.positions = [
    ...Array.from({ length: 45 }, (_, i) => ({
      ...snapshot.positions[0],
      id: `other-${i}`,
      name: "Mūra darbs",
      sourceRow: i,
    })),
    snapshot.positions[0],
  ];
  const model = scriptedReview();
  expect(
    (
      await runDiaryReviewAgent(
        snapshot,
        new MemorySession(),
        async () => {},
        model,
      )
    ).proposal.records[0].assignment?.positionId,
  ).toBe("concrete");
  expect(JSON.stringify(model.calls[3].input)).toContain("concrete");
});

it("does not send unbounded source content to a paid model", async () => {
  const snapshot = reviewSnapshot();
  snapshot.records[0].sourceText = "a".repeat(120001);
  const model = new ScriptedModel();
  await expect(
    runDiaryReviewAgent(snapshot, new MemorySession(), async () => {}, model),
  ).rejects.toThrow("REVIEW_SOURCE_TOO_LARGE");
  expect(model.calls).toHaveLength(0);
});
