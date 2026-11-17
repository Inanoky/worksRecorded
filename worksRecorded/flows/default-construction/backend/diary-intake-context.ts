import "server-only";
import { prisma } from "@/lib/utils/db";
import type { DiaryIntakeContext } from "../lib/diary-intake";
import { rigaDate } from "../lib/diary-intake";
import { normalizeForma2WorkOptionKey } from "../lib/forma2-work-options-manifest";
import { hasDefaultConstructionQuantityProfile } from "../lib/quantity-plan-actual";
import { requireConstructionProjectAccess } from "./construction-project-access";
import { diaryReviewForma2, diaryReviewHash } from "./diary-review-data";
import { getCurrentForma2WorkSelections } from "./forma2-data-read";
import type { ConfigMap } from "./site-manager-agent/AIschemas";
import { buildSiteDiaryExtractionContext } from "./site-manager-agent/siteDiaryExtractionContext";

export type DiaryIntakeScope = {
  siteId: string;
  organizationId: string;
  userId: string;
  senderPhone: string;
  sourceMessageId: string;
};

export async function buildDiaryIntakeContext(
  scope: DiaryIntakeScope,
  sourceText: string,
  now = new Date(),
): Promise<DiaryIntakeContext> {
  const access = await requireConstructionProjectAccess(
    scope.userId,
    scope.siteId,
  );
  if (access.organizationId !== scope.organizationId)
    throw new Error("INTAKE_TENANT_CHANGED");
  const [analytics, feedback, extraction] = await Promise.all([
    prisma.analytics.findUnique({
      where: { siteId: scope.siteId },
      select: { currentWeekProgress: true },
    }),
    prisma.constructionDiaryFeedback.findUnique({
      where: { siteId_domain: { siteId: scope.siteId, domain: "diary" } },
    }),
    buildSiteDiaryExtractionContext({
      siteId: scope.siteId,
      userId: scope.userId,
      sourceText,
      requestedDate: now,
      config: access.diaryConfig as ConfigMap,
    }),
  ]);
  const { state } = diaryReviewForma2(analytics?.currentWeekProgress);
  const selections = getCurrentForma2WorkSelections(access.diaryConfig, state);
  const config = access.diaryConfig as Record<string, unknown>;
  const works = config.Works as
    | { DropDownOptions?: Record<string, string> }
    | undefined;
  const workOptions = [
    ...new Set([
      ...Object.values(works?.DropDownOptions ?? {}),
      ...selections.workOptions,
    ]),
  ];
  const workPositions = Object.fromEntries(
    workOptions.flatMap((work) => {
      const positionId = selections.positionByWorkKey.get(
        normalizeForma2WorkOptionKey(work),
      );
      return positionId ? [[work, positionId]] : [];
    }),
  );
  return {
    siteId: scope.siteId,
    userId: scope.userId,
    organizationId: scope.organizationId,
    sourceText,
    receivedDate: rigaDate(now),
    extractionContext: extraction.text,
    configHash: diaryReviewHash(access.diaryConfig),
    contextHash: diaryReviewHash({
      config: access.diaryConfig,
      document: state.document,
    }),
    documentId: state.document?.id ?? null,
    actualQuantityField: hasDefaultConstructionQuantityProfile(config)
      ? "Comments_Custom_1"
      : "Amounts",
    records: [],
    positions: state.document?.positions ?? [],
    workOptions,
    workPositions,
    guidance: [
      feedback?.userInstructions ?? "",
      feedback?.generatedPrompt ?? "",
    ]
      .join("\n")
      .slice(0, 16000),
    examples: [],
  };
}

export async function assertDiaryIntakeContextCurrent(
  scope: DiaryIntakeScope,
  context: DiaryIntakeContext,
) {
  const access = await requireConstructionProjectAccess(
    scope.userId,
    scope.siteId,
  );
  const analytics = await prisma.analytics.findUnique({
    where: { siteId: scope.siteId },
    select: { currentWeekProgress: true },
  });
  const { state } = diaryReviewForma2(analytics?.currentWeekProgress);
  if (
    access.organizationId !== scope.organizationId ||
    context.contextHash !==
      diaryReviewHash({ config: access.diaryConfig, document: state.document })
  )
    throw new Error("INTAKE_CONTEXT_CHANGED");
}
