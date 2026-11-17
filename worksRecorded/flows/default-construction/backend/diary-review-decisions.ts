import "server-only";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { buildDefaultConstructionDiaryConfig } from "../lib/diary-config";
import {
  type DiaryReviewSnapshot,
  diaryReviewEnabled,
  validateDiaryReviewProposal,
} from "../lib/diary-review";
import {
  diaryReviewPilotAllowsUser,
  diaryReviewSourceWhere,
  getDiaryReviewPilot,
} from "../lib/diary-review-pilot";
import {
  DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY,
  type Forma2Allocation,
} from "../lib/forma2-analytics";
import { requireConstructionProjectAccess } from "./construction-project-access";
import {
  diaryReviewForma2,
  diaryReviewHash,
  diaryReviewRecordSelect,
  reviewRecord,
} from "./diary-review-data";
import { diaryReviewTransaction } from "./diary-review-queue";
import { getCurrentForma2WorkSelections } from "./forma2-data-read";

export async function decideDiaryReview(args: {
  siteId: string;
  runId: string;
  userId: string;
  decision: "approve" | "reject";
}) {
  if (!diaryReviewEnabled(args.siteId)) throw new Error("REVIEW_DISABLED");
  const access = await requireConstructionProjectAccess(
    args.userId,
    args.siteId,
  );
  const pilot = getDiaryReviewPilot(access.diaryConfig);
  if (!pilot || !diaryReviewPilotAllowsUser(pilot, args.userId))
    throw new Error("REVIEW_PILOT_NOT_ALLOWED");
  const result = await diaryReviewTransaction(async (tx) => {
    const run = await tx.constructionDiaryReviewRun.findFirst({
      where: {
        id: args.runId,
        siteId: args.siteId,
        organizationId: access.organizationId,
      },
    });
    if (!run || run.status !== "waiting_approval")
      throw new Error("REVIEW_NOT_PENDING");
    if (!diaryReviewPilotAllowsUser(pilot, run.userId))
      throw new Error("REVIEW_PILOT_NOT_ALLOWED");
    const decision = { decidedBy: args.userId, decidedAt: new Date() };
    if (args.decision === "reject") {
      await tx.constructionDiaryReviewRun.update({
        where: { id: run.id },
        data: { ...decision, status: "rejected" },
      });
      return { status: "rejected" };
    }
    const snapshot = run.snapshot as unknown as DiaryReviewSnapshot;
    if (
      !snapshot ||
      snapshot.siteId !== args.siteId ||
      snapshot.organizationId !== access.organizationId ||
      snapshot.userId !== run.userId
    )
      throw new Error("REVIEW_INVALID_SNAPSHOT");
    const proposal = validateDiaryReviewProposal(run.proposal, snapshot);
    const [site, analytics, rows] = await Promise.all([
      tx.site.findUniqueOrThrow({
        where: { id: args.siteId },
        select: {
          organizationId: true,
          siteDiaryRecordsMap: true,
          bisCaseId: true,
          bisCaseNumber: true,
        },
      }),
      tx.analytics.findUnique({
        where: { siteId: args.siteId },
        select: { currentWeekProgress: true },
      }),
      tx.sitediaryrecords.findMany({
        where: {
          id: { in: snapshot.records.map((record) => record.id) },
          siteId: args.siteId,
          userId: run.userId,
          archivedAt: null,
          ...diaryReviewSourceWhere(pilot),
          OR: [
            { organizationId: access.organizationId },
            { organizationId: null },
          ],
        },
        select: diaryReviewRecordSelect,
      }),
    ]);
    const config = buildDefaultConstructionDiaryConfig(site);
    const { root, state } = diaryReviewForma2(analytics?.currentWeekProgress);
    const selections = getCurrentForma2WorkSelections(config, state);
    const unchanged =
      site.organizationId === access.organizationId &&
      diaryReviewHash(config) === snapshot.configHash &&
      (state.document?.id ?? null) === snapshot.documentId &&
      diaryReviewHash(state.document?.positions ?? []) ===
        diaryReviewHash(snapshot.positions) &&
      rows.length === snapshot.records.length &&
      rows.every(
        (row) =>
          diaryReviewHash(reviewRecord(row, state, selections)) ===
          diaryReviewHash(snapshot.records.find((item) => item.id === row.id)),
      );
    if (!unchanged) {
      await tx.constructionDiaryReviewRun.update({
        where: { id: run.id },
        data: {
          ...decision,
          status: "stale",
          errorCode: "REVIEW_SOURCE_CHANGED",
        },
      });
      return { status: "stale" };
    }
    let allocations = [...state.allocations];
    let assignmentChanged = false;
    for (const proposed of proposal.records) {
      if (proposed.verdict !== "changes") continue;
      const data = Object.fromEntries(
        proposed.changes.map((change) => [
          change.field,
          change.field === "Comments_Custom_1" && change.value !== null
            ? String(change.value)
            : change.value,
        ]),
      ) as Prisma.sitediaryrecordsUpdateManyMutationInput;
      if (proposed.changes.length) {
        const updated = await tx.sitediaryrecords.updateMany({
          where: {
            id: proposed.recordId,
            siteId: args.siteId,
            userId: run.userId,
            archivedAt: null,
            BISId: null,
            OR: [
              { organizationId: access.organizationId },
              { organizationId: null },
            ],
          },
          data,
        });
        if (updated.count !== 1) throw new Error("REVIEW_SOURCE_CHANGED");
      }
      if (proposed.assignment) {
        const allocation: Forma2Allocation = {
          sourceId: proposed.recordId,
          sourceType: "work",
          positionId: proposed.assignment.positionId,
          method: "manual",
          overrideJournalPosition: true,
          confidence: null,
          assignedAt: new Date().toISOString(),
          basis: `AI pārbaude ${run.id}; lietotājs apstiprināja.`,
        };
        allocations = [
          ...allocations.filter(
            (item) =>
              item.sourceType !== "work" || item.sourceId !== proposed.recordId,
          ),
          allocation,
        ];
        assignmentChanged = true;
      }
    }
    if (assignmentChanged) {
      const updated = await tx.analytics.updateMany({
        where: {
          siteId: args.siteId,
          currentWeekProgress: {
            equals: analytics?.currentWeekProgress as Prisma.InputJsonValue,
          },
        },
        data: {
          currentWeekProgress: {
            ...root,
            [DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY]: {
              ...state,
              allocations,
            },
          } as unknown as Prisma.InputJsonValue,
        },
      });
      if (updated.count !== 1) throw new Error("REVIEW_SOURCE_CHANGED");
    }
    const updated = await tx.constructionDiaryReviewRun.updateMany({
      where: { id: run.id, status: "waiting_approval" },
      data: { ...decision, status: "completed" },
    });
    if (updated.count !== 1) throw new Error("REVIEW_NOT_PENDING");
    return { status: "completed" };
  });
  if (result.status === "completed") {
    revalidatePath(`/dashboard/sites/${args.siteId}`);
    revalidatePath(`/dashboard/sites/${args.siteId}/analytics`);
    revalidatePath(`/dashboard/sites/${args.siteId}/dashboard`);
    revalidatePath(`/dashboard/sites/${args.siteId}/siteDiary`);
  }
  return result;
}
