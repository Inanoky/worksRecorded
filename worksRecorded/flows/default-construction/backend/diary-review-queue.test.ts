import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/db";
import { reviewPilotConfig } from "@/test/fixtures/diary-review";
import { requireConstructionProjectAccess } from "./construction-project-access";
import {
  claimDiaryReview,
  diaryReviewTransaction,
  enqueueDiaryReview,
  finishDiaryReview,
  prepareDiaryReviewScope,
} from "./diary-review-queue";

jest.mock("./construction-project-access", () => ({
  requireConstructionProjectAccess: jest.fn(),
}));
jest.mock("@/lib/utils/db", () => ({
  prisma: {
    $transaction: jest.fn(),
    sitediaryrecords: { findMany: jest.fn() },
    constructionDiaryReviewQueue: {
      upsert: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    constructionDiaryReviewRun: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const db = prisma;
const now = new Date("2026-11-16T08:20:00Z");
const scope = {
  siteId: "site",
  userId: "user",
  organizationId: "org",
  recordIds: ["new"],
};
function queue() {
  return {
    id: "queue",
    siteId: "site",
    userId: "user",
    organizationId: "org",
    recordIds: ["first"],
    revision: 1,
    firstReceivedAt: new Date("2026-11-16T08:00:00Z"),
    lastReceivedAt: new Date("2026-11-16T08:10:00Z"),
    processAfter: now,
    leaseToken: null,
    leaseUntil: null,
    activeRunId: null,
    failures: 0,
  };
}
const originalFlag = process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED;
const originalSites = process.env.CONSTRUCTION_DIARY_REVIEW_SITE_IDS;
beforeEach(() => {
  jest.clearAllMocks();
  process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED = "true";
  delete process.env.CONSTRUCTION_DIARY_REVIEW_SITE_IDS;
  (db.sitediaryrecords.findMany as jest.Mock).mockImplementation(
    async (args: { where: { id: { in: string[] } } }) =>
      args.where.id.in.map((id) => ({ id })),
  );
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
  jest
    .mocked(db.constructionDiaryReviewQueue.findFirst)
    .mockResolvedValue(queue() as never);
  jest
    .mocked(db.constructionDiaryReviewQueue.findUniqueOrThrow)
    .mockResolvedValue(queue() as never);
  jest
    .mocked(db.constructionDiaryReviewQueue.updateMany)
    .mockResolvedValue({ count: 1 });
  (db.constructionDiaryReviewRun.create as jest.Mock).mockImplementation(
    async (args: unknown) =>
      ({ id: "run", ...(args as { data: object }).data }) as never,
  );
});
afterAll(() => {
  if (originalFlag === undefined)
    delete process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED;
  else process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED = originalFlag;
  if (originalSites === undefined)
    delete process.env.CONSTRUCTION_DIARY_REVIEW_SITE_IDS;
  else process.env.CONSTRUCTION_DIARY_REVIEW_SITE_IDS = originalSites;
});

it("coalesces messages without losing existing IDs or extending the maximum wait", async () => {
  await enqueueDiaryReview(
    db as never,
    { ...scope, recordIds: ["first", "new"] },
    new Date("2026-11-16T08:27:00Z"),
  );
  expect(db.constructionDiaryReviewQueue.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        recordIds: ["first", "new"],
        processAfter: new Date("2026-11-16T08:30:00Z"),
      }),
    }),
  );
});

it("does not enqueue evaluations or disabled projects", async () => {
  expect(await prepareDiaryReviewScope({ ...scope, isEval: true })).toBeNull();
  process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED = "false";
  await enqueueDiaryReview(db as never, scope, now);
  expect(requireConstructionProjectAccess).not.toHaveBeenCalled();
  expect(db.constructionDiaryReviewQueue.upsert).not.toHaveBeenCalled();
});

it("rejects a tenant mismatch before touching the queue", async () => {
  await expect(
    enqueueDiaryReview(db as never, { ...scope, organizationId: "other" }, now),
  ).rejects.toThrow("REVIEW_TENANT_CHANGED");
  expect(db.constructionDiaryReviewQueue.upsert).not.toHaveBeenCalled();
});

it("only enrolls a trusted WhatsApp message from the project's configured pilot sender", async () => {
  const input = {
    ...scope,
    isEval: false,
    senderPhone: "+37120000001",
    sourceMessageId: "wamid.pilot",
  };
  expect(await prepareDiaryReviewScope(input)).toEqual({
    siteId: "site",
    userId: "user",
    organizationId: "org",
    senderPhone: "37120000001",
    sourceMessageId: "wamid.pilot",
  });
  expect(
    await prepareDiaryReviewScope({ ...input, senderPhone: "+37120000000" }),
  ).toBeNull();
  expect(
    await prepareDiaryReviewScope({ ...input, senderPhone: undefined }),
  ).toBeNull();
  expect(
    await prepareDiaryReviewScope({ ...input, sourceMessageId: undefined }),
  ).toBeNull();
  jest
    .mocked(requireConstructionProjectAccess)
    .mockResolvedValue({ organizationId: "org", diaryConfig: {} } as never);
  expect(await prepareDiaryReviewScope(input)).toBeNull();
});

it("does not enqueue records without persisted pilot WhatsApp provenance", async () => {
  jest.mocked(db.sitediaryrecords.findMany).mockResolvedValueOnce([]);
  await expect(enqueueDiaryReview(db as never, scope)).rejects.toThrow(
    "REVIEW_SOURCE_NOT_ALLOWED",
  );
  expect(db.constructionDiaryReviewQueue.upsert).not.toHaveBeenCalled();
  expect(db.sitediaryrecords.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        siteId: "site",
        userId: "user",
        AND: expect.arrayContaining([
          {
            evalMetadata: {
              path: ["diaryReviewSource", "channel"],
              equals: "whatsapp",
            },
          },
        ]),
      }),
    }),
  );
});

it("claims a bounded immutable run and leaves overflow queued", async () => {
  jest.mocked(db.constructionDiaryReviewQueue.findFirst).mockResolvedValue({
    ...queue(),
    recordIds: Array.from({ length: 45 }, (_, i) => `row-${i}`),
  } as never);
  const run = await claimDiaryReview(now);
  expect((run?.recordIds as string[]).length).toBe(40);
  expect(db.constructionDiaryReviewQueue.update).toHaveBeenLastCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        recordIds: ["row-40", "row-41", "row-42", "row-43", "row-44"],
        activeRunId: "run",
      }),
    }),
  );
});

it("does not create a second run when another worker acquires the revision", async () => {
  jest
    .mocked(db.constructionDiaryReviewQueue.updateMany)
    .mockResolvedValue({ count: 0 });
  expect(await claimDiaryReview(now)).toBeNull();
  expect(db.constructionDiaryReviewRun.create).not.toHaveBeenCalled();
});

it("recovers an expired worker without prematurely consuming new messages", async () => {
  const later = new Date(now.getTime() + 600000);
  jest.mocked(db.constructionDiaryReviewQueue.findFirst).mockResolvedValue({
    ...queue(),
    recordIds: ["new"],
    processAfter: later,
    activeRunId: "old-run",
    leaseToken: "old",
    leaseUntil: new Date(now.getTime() - 1),
  } as never);
  jest.mocked(db.constructionDiaryReviewRun.findUnique).mockResolvedValue({
    id: "old-run",
    status: "running",
    recordIds: ["old"],
  } as never);
  expect((await claimDiaryReview(now))?.recordIds).toEqual(["old"]);
  expect(db.constructionDiaryReviewQueue.update).toHaveBeenLastCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        recordIds: ["new"],
        processAfter: later,
        failures: 1,
      }),
    }),
  );
  expect(db.constructionDiaryReviewRun.update).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: "old-run" },
      data: expect.objectContaining({ status: "failed" }),
    }),
  );
});

it("stops repeatedly expired runs after three attempts while retaining source IDs", async () => {
  jest.mocked(db.constructionDiaryReviewQueue.findFirst).mockResolvedValue({
    ...queue(),
    activeRunId: "old-run",
    failures: 2,
  } as never);
  jest.mocked(db.constructionDiaryReviewRun.findUnique).mockResolvedValue({
    id: "old-run",
    status: "running",
    recordIds: ["old"],
  } as never);
  expect(await claimDiaryReview(now)).toBeNull();
  expect(db.constructionDiaryReviewRun.create).not.toHaveBeenCalled();
  expect(db.constructionDiaryReviewQueue.update).toHaveBeenLastCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        recordIds: ["old", "first"],
        failures: 3,
        processAfter: null,
      }),
    }),
  );
});

it("preserves messages received during a completed run", async () => {
  jest
    .mocked(db.constructionDiaryReviewQueue.findUniqueOrThrow)
    .mockResolvedValue({
      ...queue(),
      recordIds: ["new"],
      leaseToken: "lease",
      leaseUntil: new Date(Date.now() + 60000),
    } as never);
  jest
    .mocked(db.constructionDiaryReviewRun.findUniqueOrThrow)
    .mockResolvedValue({
      status: "running",
      leaseToken: "lease",
      recordIds: ["old"],
    } as never);
  await finishDiaryReview({
    id: "run",
    queueId: "queue",
    leaseToken: "lease",
    status: "waiting_approval",
  });
  expect(db.constructionDiaryReviewQueue.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ recordIds: ["new"], activeRunId: null }),
    }),
  );
});

it("requeues failed sources but stops after the third failure", async () => {
  jest
    .mocked(db.constructionDiaryReviewQueue.findUniqueOrThrow)
    .mockResolvedValue({
      ...queue(),
      recordIds: ["new"],
      failures: 2,
      leaseToken: "lease",
      leaseUntil: new Date(Date.now() + 60000),
    } as never);
  jest
    .mocked(db.constructionDiaryReviewRun.findUniqueOrThrow)
    .mockResolvedValue({
      status: "running",
      leaseToken: "lease",
      recordIds: ["old"],
    } as never);
  await finishDiaryReview({
    id: "run",
    queueId: "queue",
    leaseToken: "lease",
    status: "failed",
    errorCode: "REVIEW_EXECUTION_FAILED",
  });
  expect(db.constructionDiaryReviewQueue.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        recordIds: ["old", "new"],
        failures: 3,
        processAfter: null,
      }),
    }),
  );
});

it("refuses to publish results after losing the worker lease", async () => {
  await expect(
    finishDiaryReview({
      id: "run",
      queueId: "queue",
      leaseToken: "lost",
      status: "completed",
    }),
  ).rejects.toThrow("REVIEW_LEASE_LOST");
  expect(db.constructionDiaryReviewRun.update).not.toHaveBeenCalled();
});

it("retries a serializable database conflict without retrying arbitrary failures", async () => {
  jest.mocked(db.$transaction).mockRejectedValueOnce(
    new Prisma.PrismaClientKnownRequestError("conflict", {
      code: "P2034",
      clientVersion: "test",
    }),
  );
  const work = jest.fn().mockResolvedValue("ok");
  expect(await diaryReviewTransaction(work)).toBe("ok");
  expect(db.$transaction).toHaveBeenCalledTimes(2);
  jest.mocked(db.$transaction).mockRejectedValueOnce(new Error("offline"));
  await expect(diaryReviewTransaction(work)).rejects.toThrow("offline");
});
