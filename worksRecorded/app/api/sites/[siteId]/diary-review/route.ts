import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { requireConstructionProjectAccess } from "@/flows/default-construction/backend/construction-project-access";
import {
  DIARY_REVIEW_TIMEOUT_MS,
  diaryReviewEnabled,
} from "@/flows/default-construction/lib/diary-review";
import {
  diaryReviewPilotAllowsUser,
  getDiaryReviewPilot,
} from "@/flows/default-construction/lib/diary-review-pilot";
import { ProjectAccessError } from "@/flows/default-construction/visual/project-access-error";
import { prisma } from "@/lib/utils/db";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ siteId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { siteId } = await context.params;
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    if (!user) throw new ProjectAccessError("Unauthorized");
    const access = await requireConstructionProjectAccess(user.id, siteId);
    const pilot = getDiaryReviewPilot(access.diaryConfig);
    if (
      !diaryReviewEnabled(siteId) ||
      !diaryReviewPilotAllowsUser(pilot, user.id)
    )
      return Response.json({ enabled: false, runs: [] });
    const runs = await prisma.constructionDiaryReviewRun.findMany({
      where: {
        siteId,
        organizationId: access.organizationId,
        userId: user.id,
        queueId: "whatsapp-direct",
      },
      select: {
        id: true,
        status: true,
        recordIds: true,
        snapshot: true,
        metrics: true,
        errorCode: true,
        createdAt: true,
        finishedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return Response.json(
      {
        enabled: true,
        runs: runs.map(({ snapshot, ...run }) => {
          const data = snapshot as {
            sourceText?: string;
            reply?: string;
            generatedRecords?: unknown[];
            positions?: unknown[];
          } | null;
          return {
            ...run,
            status:
              run.status === "running" &&
              Date.now() - run.createdAt.getTime() >
                DIARY_REVIEW_TIMEOUT_MS + 60000
                ? "interrupted"
                : run.status,
            sourceText: data?.sourceText ?? "",
            reply: data?.reply ?? "",
            records: data?.generatedRecords ?? [],
            positions: data?.positions ?? [],
          };
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ProjectAccessError)
      return Response.json(
        { error: "Nav piekļuves projektam." },
        { status: error.message === "Unauthorized" ? 401 : 403 },
      );
    console.error("[diary-intake] history load failed");
    return Response.json(
      {
        error:
          "Neizdevās ielādēt aģenta izpildes. Pārbaudiet, vai datubāzes migrācija ir piemērota.",
      },
      { status: 500 },
    );
  }
}
