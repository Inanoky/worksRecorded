import { notFound } from "next/navigation";
import { requireConstructionProjectAccess } from "@/flows/default-construction/backend/construction-project-access";
import { DiaryReviewPanel } from "@/flows/default-construction/frontend/DiaryReviewPanel";
import { diaryReviewEnabled } from "@/flows/default-construction/lib/diary-review";
import {
  diaryReviewPilotAllowsUser,
  getDiaryReviewPilot,
} from "@/flows/default-construction/lib/diary-review-pilot";
import { requireUser } from "@/lib/utils/requireUser";

export default async function DiaryReviewPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  if (!diaryReviewEnabled(siteId)) notFound();
  const user = await requireUser();
  const access = await requireConstructionProjectAccess(user.id, siteId);
  if (
    !diaryReviewPilotAllowsUser(
      getDiaryReviewPilot(access.diaryConfig),
      user.id,
    )
  )
    notFound();
  return <DiaryReviewPanel siteId={siteId} />;
}
