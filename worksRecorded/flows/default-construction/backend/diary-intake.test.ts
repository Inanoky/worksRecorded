import { prisma } from "@/lib/utils/db";
import { saveSiteDiaryRecord } from "@/server/actions/site-diary-actions";
import { intakeContext, intakeDraft } from "@/test/fixtures/diary-intake";
import { diaryIntakeRunId, processDiaryIntake } from "./diary-intake";
import { runDiaryIntakeAgent } from "./diary-intake-agent";
import {
  assertDiaryIntakeContextCurrent,
  buildDiaryIntakeContext,
} from "./diary-intake-context";

jest.mock("@/lib/utils/db", () => ({
  prisma: {
    constructionDiaryReviewRun: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    siteDiarySaveBatch: { findUnique: jest.fn() },
  },
}));
jest.mock("@/server/actions/site-diary-actions", () => ({
  saveSiteDiaryRecord: jest.fn(),
}));
jest.mock("./diary-intake-agent", () => ({ runDiaryIntakeAgent: jest.fn() }));
jest.mock("./diary-intake-context", () => ({
  buildDiaryIntakeContext: jest.fn(),
  assertDiaryIntakeContextCurrent: jest.fn(),
}));
const scope = {
  siteId: "site",
  userId: "user",
  organizationId: "org",
  senderPhone: "37120000001",
  sourceMessageId: "message",
};
beforeEach(() => {
  jest.resetAllMocks();
  jest
    .mocked(prisma.constructionDiaryReviewRun.create)
    .mockResolvedValue({} as never);
  jest
    .mocked(prisma.constructionDiaryReviewRun.updateMany)
    .mockResolvedValue({ count: 1 });
  jest.mocked(prisma.siteDiarySaveBatch.findUnique).mockResolvedValue(null);
  jest.mocked(buildDiaryIntakeContext).mockResolvedValue(intakeContext());
  jest.mocked(runDiaryIntakeAgent).mockResolvedValue({
    draft: intakeDraft(),
    metrics: {
      model: "scripted",
      durationMs: 1,
      toolCalls: 5,
      requests: 6,
      inputTokens: 1,
      outputTokens: 1,
      totalTokens: 2,
    },
  });
  jest.mocked(saveSiteDiaryRecord).mockResolvedValue({
    ok: true,
    count: 1,
    records: [],
    recordIds: [],
  } as never);
});
it("saves validated SDK output through the existing business action with atomic run-completion arguments", async () => {
  expect(await processDiaryIntake(scope, intakeContext().sourceText)).toContain(
    "Saglabāti 1",
  );
  expect(saveSiteDiaryRecord).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: "user",
      siteId: "site",
      sourceMessageId: "message",
      rows: [expect.objectContaining({ Works: "Betonēšana", Amounts: 12.5 })],
      diaryIntakeRun: expect.objectContaining({
        id: diaryIntakeRunId(scope),
        positionIds: ["concrete"],
      }),
    }),
  );
  expect(assertDiaryIntakeContextCurrent).toHaveBeenCalledWith(
    scope,
    intakeContext(),
  );
});
it("reuses a completed reply for webhook duplicates without a second model call or save", async () => {
  jest
    .mocked(prisma.constructionDiaryReviewRun.create)
    .mockRejectedValue({ code: "P2002" });
  jest.mocked(prisma.constructionDiaryReviewRun.findFirst).mockResolvedValue({
    status: "completed",
    snapshot: { reply: "Saglabāts jau iepriekš." },
    createdAt: new Date(),
  } as never);
  expect(await processDiaryIntake(scope, "same")).toBe(
    "Saglabāts jau iepriekš.",
  );
  expect(runDiaryIntakeAgent).not.toHaveBeenCalled();
  expect(saveSiteDiaryRecord).not.toHaveBeenCalled();
});
it("does not restart a running or failed duplicate", async () => {
  jest
    .mocked(prisma.constructionDiaryReviewRun.create)
    .mockRejectedValue({ code: "P2002" });
  jest.mocked(prisma.constructionDiaryReviewRun.findFirst).mockResolvedValue({
    status: "running",
    snapshot: null,
    createdAt: new Date(),
  } as never);
  expect(await processDiaryIntake(scope, "same")).toContain(
    "jau tiek apstrādāta",
  );
  jest.mocked(prisma.constructionDiaryReviewRun.findFirst).mockResolvedValue({
    status: "failed",
    snapshot: null,
    createdAt: new Date(),
  } as never);
  expect(await processDiaryIntake(scope, "same")).toContain("neizdevās");
  expect(runDiaryIntakeAgent).not.toHaveBeenCalled();
});
it("does not write records on model failure or changed project context", async () => {
  jest
    .mocked(runDiaryIntakeAgent)
    .mockRejectedValueOnce(new Error("model failure"));
  expect(await processDiaryIntake(scope, "report")).toContain("neizdevās");
  expect(saveSiteDiaryRecord).not.toHaveBeenCalled();
  jest
    .mocked(assertDiaryIntakeContextCurrent)
    .mockRejectedValue(new Error("INTAKE_CONTEXT_CHANGED"));
  expect(
    await processDiaryIntake(
      { ...scope, sourceMessageId: "another" },
      "report",
    ),
  ).toContain("neizdevās");
  expect(saveSiteDiaryRecord).not.toHaveBeenCalled();
});
it("logs clarification without creating a diary record", async () => {
  jest.mocked(runDiaryIntakeAgent).mockResolvedValue({
    draft: { intent: "clarify", reply: "Kāds darbs?", records: [] },
    metrics: {},
  } as never);
  expect(await processDiaryIntake(scope, "gatavs")).toBe("Kāds darbs?");
  expect(saveSiteDiaryRecord).not.toHaveBeenCalled();
  expect(prisma.constructionDiaryReviewRun.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ status: "needs_clarification" }),
    }),
  );
});
it("fails closed before any model call when logging tables are unavailable", async () => {
  jest
    .mocked(prisma.constructionDiaryReviewRun.create)
    .mockRejectedValue(new Error("missing table"));
  expect(await processDiaryIntake(scope, "report")).toContain("neizdevās");
  expect(runDiaryIntakeAgent).not.toHaveBeenCalled();
});
it("does not re-extract a message already saved by another flow", async () => {
  jest
    .mocked(prisma.siteDiarySaveBatch.findUnique)
    .mockResolvedValue({ id: "existing" } as never);
  expect(await processDiaryIntake(scope, "same")).toContain("neizdevās");
  expect(runDiaryIntakeAgent).not.toHaveBeenCalled();
});
