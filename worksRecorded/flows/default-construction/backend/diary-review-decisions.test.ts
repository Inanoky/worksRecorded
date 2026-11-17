import { prisma } from "@/lib/utils/db";
import {
  reviewPilotConfig,
  reviewProposal,
  reviewSnapshot,
} from "@/test/fixtures/diary-review";
import { requireConstructionProjectAccess } from "./construction-project-access";
import { diaryReviewForma2, diaryReviewHash } from "./diary-review-data";
import { decideDiaryReview } from "./diary-review-decisions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("./construction-project-access", () => ({
  requireConstructionProjectAccess: jest.fn(),
}));
jest.mock("../lib/diary-config", () => ({
  buildDefaultConstructionDiaryConfig: () => ({}),
}));
jest.mock("./forma2-data-read", () => ({
  getCurrentForma2WorkSelections: () => ({
    positionByWorkKey: new Map(),
    workOptions: ["Betonēšana"],
  }),
}));
jest.mock("@/lib/utils/db", () => ({
  prisma: {
    $transaction: jest.fn(),
    site: { findUniqueOrThrow: jest.fn() },
    analytics: { findUnique: jest.fn(), updateMany: jest.fn() },
    sitediaryrecords: { findMany: jest.fn(), updateMany: jest.fn() },
    constructionDiaryReviewRun: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

const db = prisma;
const originalFlag = process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED;
const originalSites = process.env.CONSTRUCTION_DIARY_REVIEW_SITE_IDS;
const args = {
  siteId: "site",
  runId: "run",
  userId: "reviewer",
  decision: "approve" as const,
};
let snapshot: ReturnType<typeof reviewSnapshot>;
let row: Record<string, unknown>;
let root: Record<string, unknown>;
beforeEach(() => {
  jest.clearAllMocks();
  process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED = "true";
  delete process.env.CONSTRUCTION_DIARY_REVIEW_SITE_IDS;
  snapshot = reviewSnapshot();
  snapshot.configHash = diaryReviewHash({});
  root = {
    untouched: { value: 1 },
    defaultConstructionForma2: {
      version: 1,
      document: {
        id: snapshot.documentId,
        fileName: "tame.xlsx",
        sheetName: "Tāme",
        importedAt: "2026-11-16",
        positions: snapshot.positions,
      },
      allocations: [],
      materialRules: [],
    },
  };
  snapshot.positions =
    diaryReviewForma2(root as never).state.document?.positions ?? [];
  row = {
    id: "row",
    siteId: "site",
    organizationId: "org",
    userId: "user",
    Date: new Date(snapshot.records[0].date as string),
    BISId: null,
    originalUserComment: snapshot.records[0].sourceText,
    ...snapshot.records[0].fields,
  };
  jest
    .mocked(requireConstructionProjectAccess)
    .mockResolvedValue({
      organizationId: "org",
      diaryConfig: reviewPilotConfig(),
    } as never);
  jest
    .mocked(db.$transaction)
    .mockImplementation(
      async (work: unknown) =>
        (work as (tx: unknown) => Promise<unknown>)(db) as never,
    );
  jest.mocked(db.site.findUniqueOrThrow).mockResolvedValue({
    organizationId: "org",
    siteDiaryRecordsMap: {},
    bisCaseId: null,
    bisCaseNumber: null,
  } as never);
  (db.analytics.findUnique as jest.Mock).mockImplementation(
    async () => ({ currentWeekProgress: root }) as never,
  );
  jest.mocked(db.analytics.updateMany).mockResolvedValue({ count: 1 });
  (db.sitediaryrecords.findMany as jest.Mock).mockImplementation(
    async () => [row] as never,
  );
  jest.mocked(db.sitediaryrecords.updateMany).mockResolvedValue({ count: 1 });
  (db.constructionDiaryReviewRun.findFirst as jest.Mock).mockImplementation(
    async () =>
      ({
        id: "run",
        siteId: "site",
        organizationId: "org",
        userId: "user",
        status: "waiting_approval",
        snapshot,
        proposal: reviewProposal(),
      }) as never,
  );
  jest
    .mocked(db.constructionDiaryReviewRun.updateMany)
    .mockResolvedValue({ count: 1 });
});
afterAll(() => {
  if (originalFlag === undefined)
    delete process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED;
  else process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED = originalFlag;
  if (originalSites === undefined)
    delete process.env.CONSTRUCTION_DIARY_REVIEW_SITE_IDS;
  else process.env.CONSTRUCTION_DIARY_REVIEW_SITE_IDS = originalSites;
});

it("applies the reviewed values and a protected manual assignment in one transaction", async () => {
  expect(await decideDiaryReview(args)).toEqual({ status: "completed" });
  expect(db.sitediaryrecords.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        id: "row",
        siteId: "site",
        userId: "user",
        BISId: null,
      }),
      data: { Amounts: 12.5 },
    }),
  );
  expect(db.analytics.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      data: {
        currentWeekProgress: expect.objectContaining({
          untouched: { value: 1 },
          defaultConstructionForma2: expect.objectContaining({
            allocations: [
              expect.objectContaining({
                sourceId: "row",
                positionId: "concrete",
                method: "manual",
                overrideJournalPosition: true,
              }),
            ],
          }),
        }),
      },
    }),
  );
  expect(db.constructionDiaryReviewRun.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: "run", status: "waiting_approval" },
      data: expect.objectContaining({
        decidedBy: "reviewer",
        status: "completed",
      }),
    }),
  );
});

it("compares JSONB snapshots independently of object key order", () => {
  expect(diaryReviewHash({ a: 1, nested: { b: 2, a: 3 } })).toBe(
    diaryReviewHash({ nested: { a: 3, b: 2 }, a: 1 }),
  );
});

it.each(["quantity", "BIS", "source", "configuration", "estimate"])(
  "rejects stale %s data without applying any business writes",
  async (change) => {
    if (change === "quantity") row.Amounts = 20;
    if (change === "BIS") row.BISId = "sent";
    if (change === "source") row.originalUserComment = "Labojums: 20 m3";
    if (change === "configuration") snapshot.configHash = "older-config";
    if (change === "estimate") snapshot.documentId = "older-estimate";
    expect(await decideDiaryReview(args)).toEqual({ status: "stale" });
    expect(db.sitediaryrecords.updateMany).not.toHaveBeenCalled();
    expect(db.analytics.updateMany).not.toHaveBeenCalled();
    expect(db.constructionDiaryReviewRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "stale" }),
      }),
    );
  },
);

it("does not read or mutate a run from another project", async () => {
  jest.mocked(db.constructionDiaryReviewRun.findFirst).mockResolvedValue(null);
  await expect(decideDiaryReview(args)).rejects.toThrow("REVIEW_NOT_PENDING");
  expect(db.constructionDiaryReviewRun.findFirst).toHaveBeenCalledWith({
    where: { id: "run", siteId: "site", organizationId: "org" },
  });
  expect(db.sitediaryrecords.findMany).not.toHaveBeenCalled();
});

it("refuses a repeated approval after a run was completed", async () => {
  jest
    .mocked(db.constructionDiaryReviewRun.findFirst)
    .mockResolvedValue({ status: "completed" } as never);
  await expect(decideDiaryReview(args)).rejects.toThrow("REVIEW_NOT_PENDING");
  expect(db.sitediaryrecords.updateMany).not.toHaveBeenCalled();
});

it("rejects proposals without touching diary or Forma2 data", async () => {
  expect(await decideDiaryReview({ ...args, decision: "reject" })).toEqual({
    status: "rejected",
  });
  expect(db.sitediaryrecords.findMany).not.toHaveBeenCalled();
  expect(db.analytics.updateMany).not.toHaveBeenCalled();
});

it("reauthorizes the reviewing user before reading the proposal", async () => {
  jest
    .mocked(requireConstructionProjectAccess)
    .mockRejectedValue(new Error("Access revoked"));
  await expect(decideDiaryReview(args)).rejects.toThrow("Access revoked");
  expect(db.$transaction).not.toHaveBeenCalled();
});
