import type { AgentInputItem } from "@openai/agents";
import { prisma } from "@/lib/utils/db";
import { DiaryReviewSession } from "./diary-review-session";

jest.mock("@/lib/utils/db", () => ({
  prisma: {
    constructionDiaryReviewRun: { findFirst: jest.fn(), updateMany: jest.fn() },
  },
}));
let stored: AgentInputItem[];
const input = {
  type: "message",
  role: "user",
  content: "Pārbaudi",
} as AgentInputItem;
beforeEach(() => {
  jest.clearAllMocks();
  stored = [];
  (prisma.constructionDiaryReviewRun.findFirst as jest.Mock).mockImplementation(
    async () => ({ sessionItems: stored }) as never,
  );
  (
    prisma.constructionDiaryReviewRun.updateMany as jest.Mock
  ).mockImplementation(async (args: unknown) => {
    stored = (args as { data: { sessionItems: AgentInputItem[] } }).data
      .sessionItems;
    return { count: 1 };
  });
});

it("loads persistent SDK history without replaying the current turn twice", async () => {
  const session = new DiaryReviewSession("run", "lease");
  await session.addItems([input]);
  expect(await new DiaryReviewSession("run", "lease").getItems()).toEqual([
    input,
  ]);
  expect(await session.getItems(0)).toEqual([]);
  expect(await session.getSessionId()).toBe("construction-diary-review:run");
  expect(await session.popItem()).toEqual(input);
  expect(stored).toEqual([]);
});

it("refuses persistence when a run is no longer owned by this worker", async () => {
  jest
    .mocked(prisma.constructionDiaryReviewRun.updateMany)
    .mockResolvedValue({ count: 0 });
  const session = new DiaryReviewSession("run", "lease");
  await expect(session.addItems([input])).rejects.toThrow(
    "REVIEW_SESSION_LEASE_LOST",
  );
  expect(await session.getItems()).toEqual([]);
});

it("does not load another worker's session", async () => {
  jest
    .mocked(prisma.constructionDiaryReviewRun.findFirst)
    .mockResolvedValue(null);
  await expect(
    new DiaryReviewSession("run", "old-lease").getItems(),
  ).rejects.toThrow("REVIEW_SESSION_LEASE_LOST");
});
