import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { requireConstructionProjectAccess } from "@/flows/default-construction/backend/construction-project-access";
import { ProjectAccessError } from "@/flows/default-construction/visual/project-access-error";
import { prisma } from "@/lib/utils/db";
import { reviewPilotConfig } from "@/test/fixtures/diary-review";
import { GET } from "./route";

const getUser = jest.fn();
jest.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
  getKindeServerSession: jest.fn(),
}));
jest.mock(
  "@/flows/default-construction/backend/construction-project-access",
  () => ({ requireConstructionProjectAccess: jest.fn() }),
);
jest.mock("@/lib/utils/db", () => ({
  prisma: { constructionDiaryReviewRun: { findMany: jest.fn() } },
}));
const context = { params: Promise.resolve({ siteId: "site" }) };
const originalFlag = process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED;
const originalSites = process.env.CONSTRUCTION_DIARY_REVIEW_SITE_IDS;
const originalResponse = globalThis.Response;
beforeAll(() => {
  globalThis.Response = {
    json: (data: unknown, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  } as typeof Response;
});
afterAll(() => {
  globalThis.Response = originalResponse;
  if (originalFlag === undefined)
    delete process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED;
  else process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED = originalFlag;
  if (originalSites === undefined)
    delete process.env.CONSTRUCTION_DIARY_REVIEW_SITE_IDS;
  else process.env.CONSTRUCTION_DIARY_REVIEW_SITE_IDS = originalSites;
});
beforeEach(() => {
  jest.clearAllMocks();
  process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED = "true";
  delete process.env.CONSTRUCTION_DIARY_REVIEW_SITE_IDS;
  jest.mocked(getKindeServerSession).mockReturnValue({ getUser } as never);
  getUser.mockResolvedValue({ id: "user" });
  jest.mocked(requireConstructionProjectAccess).mockResolvedValue({
    organizationId: "org",
    diaryConfig: reviewPilotConfig(),
  } as never);
  jest.mocked(prisma.constructionDiaryReviewRun.findMany).mockResolvedValue([]);
});
it("requires authentication and project membership", async () => {
  getUser.mockResolvedValue(null);
  expect((await GET({} as Request, context)).status).toBe(401);
  expect(prisma.constructionDiaryReviewRun.findMany).not.toHaveBeenCalled();
  getUser.mockResolvedValue({ id: "user" });
  jest
    .mocked(requireConstructionProjectAccess)
    .mockRejectedValue(new ProjectAccessError("denied"));
  expect((await GET({} as Request, context)).status).toBe(403);
});
it("loads only direct runs for this user and tenant without exposing SDK session history", async () => {
  expect((await GET({} as Request, context)).status).toBe(200);
  expect(prisma.constructionDiaryReviewRun.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        siteId: "site",
        organizationId: "org",
        userId: "user",
        queueId: "whatsapp-direct",
      },
    }),
  );
  expect(
    jest.mocked(prisma.constructionDiaryReviewRun.findMany).mock.calls[0][0]
      ?.select?.sessionItems,
  ).toBeUndefined();
});
it("does not query logging tables when disabled or not enrolled", async () => {
  process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED = "false";
  expect(await (await GET({} as Request, context)).json()).toEqual({
    enabled: false,
    runs: [],
  });
  process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED = "true";
  jest
    .mocked(requireConstructionProjectAccess)
    .mockResolvedValue({ organizationId: "org", diaryConfig: {} } as never);
  expect(await (await GET({} as Request, context)).json()).toEqual({
    enabled: false,
    runs: [],
  });
  expect(prisma.constructionDiaryReviewRun.findMany).not.toHaveBeenCalled();
});
it("exposes saved records and marks expired executions interrupted without restarting them", async () => {
  jest.mocked(prisma.constructionDiaryReviewRun.findMany).mockResolvedValue([
    {
      id: "run",
      status: "running",
      createdAt: new Date(Date.now() - 600000),
      recordIds: [],
      snapshot: { sourceText: "report", reply: "", generatedRecords: [] },
      metrics: null,
    },
  ] as never);
  const body = await (await GET({} as Request, context)).json();
  expect(body.runs[0]).toMatchObject({
    status: "interrupted",
    sourceText: "report",
    records: [],
  });
});
