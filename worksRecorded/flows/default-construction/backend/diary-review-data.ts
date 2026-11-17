import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/db";
import {
  type DiaryReviewRecord,
  type DiaryReviewSnapshot,
  diaryReviewFields,
} from "../lib/diary-review";
import {
  diaryReviewPilotAllowsUser,
  diaryReviewSourceWhere,
  getDiaryReviewPilot,
} from "../lib/diary-review-pilot";
import {
  DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY,
  normalizeDefaultConstructionForma2State,
} from "../lib/forma2-analytics";
import { normalizeForma2WorkOptionKey } from "../lib/forma2-work-options-manifest";
import { hasDefaultConstructionQuantityProfile } from "../lib/quantity-plan-actual";
import { requireConstructionProjectAccess } from "./construction-project-access";
import { getCurrentForma2WorkSelections } from "./forma2-data-read";

export const diaryReviewRecordSelect = {
  id: true,
  siteId: true,
  organizationId: true,
  userId: true,
  Date: true,
  BISId: true,
  Works: true,
  Location: true,
  Comments: true,
  Units: true,
  Amounts: true,
  Comments_Custom_1: true,
  WorkersInvolved: true,
  TimeInvolved: true,
  originalUserComment: true,
} satisfies Prisma.sitediaryrecordsSelect;

export function diaryReviewHash(value: unknown) {
  const canonical = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(canonical);
    if (item && typeof item === "object")
      return Object.fromEntries(
        Object.entries(item)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([key, child]) => [key, canonical(child)]),
      );
    return item;
  };
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)) ?? "null")
    .digest("hex");
}

export function diaryReviewForma2(value: Prisma.JsonValue | null | undefined) {
  const root =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    root,
    state: normalizeDefaultConstructionForma2State(
      root[DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY],
    ),
  };
}

export function reviewRecord(
  row: Prisma.sitediaryrecordsGetPayload<{
    select: typeof diaryReviewRecordSelect;
  }>,
  state: ReturnType<typeof diaryReviewForma2>["state"],
  selections: ReturnType<typeof getCurrentForma2WorkSelections>,
): DiaryReviewRecord {
  return {
    id: row.id,
    userId: row.userId,
    sourceText: row.originalUserComment ?? "",
    date: row.Date?.toISOString() ?? null,
    bisId: row.BISId,
    fields: Object.fromEntries(
      diaryReviewFields.map((field) => [
        field,
        field === "Comments_Custom_1" &&
        row[field] !== null &&
        row[field] !== "" &&
        Number.isFinite(Number(row[field]))
          ? Number(row[field])
          : row[field],
      ]),
    ) as DiaryReviewRecord["fields"],
    allocation:
      state.allocations.find(
        (item) => item.sourceType === "work" && item.sourceId === row.id,
      ) ?? null,
    selectedPositionId:
      selections.positionByWorkKey.get(
        normalizeForma2WorkOptionKey(row.Works ?? ""),
      ) ?? null,
  };
}

export async function buildDiaryReviewSnapshot(args: {
  siteId: string;
  userId: string;
  organizationId: string;
  recordIds: string[];
}): Promise<DiaryReviewSnapshot> {
  const access = await requireConstructionProjectAccess(
    args.userId,
    args.siteId,
  );
  if (access.organizationId !== args.organizationId)
    throw new Error("REVIEW_TENANT_CHANGED");
  const pilot = getDiaryReviewPilot(access.diaryConfig);
  if (!pilot || !diaryReviewPilotAllowsUser(pilot, args.userId))
    throw new Error("REVIEW_PILOT_NOT_ALLOWED");
  const [rows, analytics, feedback] = await Promise.all([
    prisma.sitediaryrecords.findMany({
      where: {
        id: { in: args.recordIds },
        siteId: args.siteId,
        userId: args.userId,
        archivedAt: null,
        ...diaryReviewSourceWhere(pilot),
        OR: [{ organizationId: args.organizationId }, { organizationId: null }],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: diaryReviewRecordSelect,
    }),
    prisma.analytics.findUnique({
      where: { siteId: args.siteId },
      select: { currentWeekProgress: true },
    }),
    prisma.constructionDiaryFeedback.findUnique({
      where: { siteId_domain: { siteId: args.siteId, domain: "diary" } },
    }),
  ]);
  if (!rows.length) throw new Error("REVIEW_NO_RECORDS");
  const { state } = diaryReviewForma2(analytics?.currentWeekProgress);
  const selections = getCurrentForma2WorkSelections(access.diaryConfig, state);
  const manual = state.allocations
    .filter(
      (item) =>
        item.sourceType === "work" && item.method === "manual" && !item.split,
    )
    .slice(-20);
  const examples = manual.length
    ? await prisma.sitediaryrecords.findMany({
        where: {
          id: { in: manual.map((item) => item.sourceId) },
          siteId: args.siteId,
          archivedAt: null,
          OR: [
            { organizationId: args.organizationId },
            { organizationId: null },
          ],
        },
        select: { id: true, Works: true },
      })
    : [];
  const config = access.diaryConfig as Record<string, unknown>;
  const works = config.Works as
    | { DropDownOptions?: Record<string, string> }
    | undefined;
  return {
    siteId: args.siteId,
    organizationId: args.organizationId,
    userId: args.userId,
    configHash: diaryReviewHash(access.diaryConfig),
    documentId: state.document?.id ?? null,
    actualQuantityField: hasDefaultConstructionQuantityProfile(config)
      ? "Comments_Custom_1"
      : "Amounts",
    records: rows.map((row) => reviewRecord(row, state, selections)),
    positions: state.document?.positions ?? [],
    workOptions: [
      ...new Set([
        ...Object.values(works?.DropDownOptions ?? {}),
        ...selections.workOptions,
      ]),
    ],
    guidance: [
      feedback?.userInstructions ?? "",
      feedback?.generatedPrompt ?? "",
    ]
      .join("\n")
      .slice(0, 16000),
    examples: examples.flatMap((row) => {
      const allocation = manual.find((item) => item.sourceId === row.id);
      return allocation
        ? [{ work: row.Works ?? "", positionId: allocation.positionId }]
        : [];
    }),
  };
}
