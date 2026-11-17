import { prisma } from "@/lib/utils/db";
import { reviewProposal, reviewSnapshot } from "@/test/fixtures/diary-review";
import { ProjectAccessError } from "../visual/project-access-error";
import { runDiaryReviewAgent } from "./diary-review-agent";
import { buildDiaryReviewSnapshot } from "./diary-review-data";
import { claimDiaryReview, finishDiaryReview } from "./diary-review-queue";
import { processNextDiaryReview } from "./diary-review-worker";

jest.mock("@/lib/utils/db", () => ({
  prisma: { constructionDiaryReviewRun: { updateMany: jest.fn() } },
}));
jest.mock("./diary-review-queue", () => ({
  claimDiaryReview: jest.fn(),
  finishDiaryReview: jest.fn(),
}));
jest.mock("./diary-review-data", () => ({
  buildDiaryReviewSnapshot: jest.fn(),
}));
jest.mock("./diary-review-agent", () => ({ runDiaryReviewAgent: jest.fn() }));
jest.mock("./diary-review-session", () => ({ DiaryReviewSession: jest.fn() }));
const originalFlag = process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED;
beforeEach(() => {
  jest.clearAllMocks();
  process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED = "true";
  jest.mocked(claimDiaryReview).mockResolvedValue({
    id: "run",
    queueId: "queue",
    leaseToken: "lease",
    siteId: "site",
    organizationId: "org",
    userId: "user",
    recordIds: ["row"],
  } as never);
  jest.mocked(buildDiaryReviewSnapshot).mockResolvedValue(reviewSnapshot());
  jest
    .mocked(prisma.constructionDiaryReviewRun.updateMany)
    .mockResolvedValue({ count: 1 });
  jest.mocked(runDiaryReviewAgent).mockResolvedValue({
    proposal: reviewProposal(),
    metrics: {
      model: "offline",
      durationMs: 1,
      toolCalls: 4,
      requests: 5,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    },
  });
});
afterAll(() => {
  if (originalFlag === undefined)
    delete process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED;
  else process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED = originalFlag;
});

it("does not claim tasks or invoke a model when disabled", async () => {
  process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED = "false";
  expect(await processNextDiaryReview()).toEqual({ status: "disabled" });
  expect(claimDiaryReview).not.toHaveBeenCalled();
  expect(runDiaryReviewAgent).not.toHaveBeenCalled();
});

it("publishes proposals for approval without directly applying business changes", async () => {
  expect(await processNextDiaryReview()).toEqual({
    id: "run",
    status: "waiting_approval",
  });
  expect(finishDiaryReview).toHaveBeenCalledWith(
    expect.objectContaining({
      id: "run",
      leaseToken: "lease",
      status: "waiting_approval",
      proposal: reviewProposal(),
    }),
  );
  expect(buildDiaryReviewSnapshot).toHaveBeenCalledWith({
    siteId: "site",
    userId: "user",
    organizationId: "org",
    recordIds: ["row"],
  });
});

it("does not spend model tokens after project access is revoked", async () => {
  jest
    .mocked(buildDiaryReviewSnapshot)
    .mockRejectedValue(new ProjectAccessError("revoked"));
  expect(await processNextDiaryReview()).toEqual({
    id: "run",
    status: "failed",
    errorCode: "REVIEW_ACCESS_REVOKED",
  });
  expect(runDiaryReviewAgent).not.toHaveBeenCalled();
  expect(finishDiaryReview).toHaveBeenCalledWith(
    expect.objectContaining({ status: "failed", retryable: false }),
  );
});

it("stops invalid output without repeatedly paying to process the same rejected result", async () => {
  jest
    .mocked(runDiaryReviewAgent)
    .mockRejectedValue(new Error("REVIEW_UNSUPPORTED_EVIDENCE"));
  await processNextDiaryReview();
  expect(finishDiaryReview).toHaveBeenCalledWith(
    expect.objectContaining({
      status: "failed",
      errorCode: "REVIEW_UNSUPPORTED_EVIDENCE",
      retryable: false,
    }),
  );
});
