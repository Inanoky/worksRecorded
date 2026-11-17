import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { FimaProjectContent } from "@/components/fima/FimaProjectProvider";
import { RegisterProjectWorkspace } from "@/components/projects/ProjectRegistration";
import { getWorkspaceRouteContext } from "@/components/projects/workspace-access";
import { retainProjectFlow } from "@/components/projects/workspace-store";
import { LimeniProjectData } from "@/flows/default-construction/frontend/LimeniProjectData";
import { RetainedLimeniDiary } from "@/flows/default-construction/frontend/RetainedLimeniDiary";
import { RetainedLimeniForma2 } from "@/flows/default-construction/frontend/RetainedLimeniForma2";
import { diaryReviewEnabled } from "@/flows/default-construction/lib/diary-review";
import {
	diaryReviewPilotAllowsUser,
	getDiaryReviewPilot,
} from "@/flows/default-construction/lib/diary-review-pilot";
import { VisualProjectView } from "@/flows/default-construction/visual/VisualProjectView";
import { DEMO_SITE_ID } from "@/flows/demo/constants";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";

export default async function ProjectLayout({
	children,
	params,
}: {
	children: ReactNode;
	params: Promise<{ siteId: string }>;
}) {
	const { siteId } = await params;
	if (siteId === DEMO_SITE_ID) redirect("/demo");
	const { descriptor, siteDiaryRecordsMap } =
		await getWorkspaceRouteContext(siteId);
	const reviewLink =
		descriptor.flowModuleKey === FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION &&
		!descriptor.fimaActs &&
		diaryReviewPilotAllowsUser(
			getDiaryReviewPilot(siteDiaryRecordsMap),
			descriptor.userId,
		) &&
		diaryReviewEnabled(siteId) ? (
			<div className="flex justify-end px-4 py-2">
				<Link
					className="text-sm underline underline-offset-4"
					href={`/dashboard/sites/${siteId}/diary-review`}
				>
					Dienasgrāmatas AI aģents
				</Link>
			</div>
		) : null;
	if (retainProjectFlow(descriptor.flowModuleKey)) {
		return (
			<RegisterProjectWorkspace descriptor={descriptor}>
				{reviewLink}
				{children}
			</RegisterProjectWorkspace>
		);
	}
	return (
		<FimaProjectContent key={siteId} siteId={siteId}>
			<LimeniProjectData key={siteId} siteId={siteId}>
				<VisualProjectView key={siteId} siteId={siteId}>
					<RetainedLimeniDiary key={siteId} siteId={siteId}>
						{reviewLink}
						{children}
						<RetainedLimeniForma2 key={siteId} siteId={siteId} />
					</RetainedLimeniDiary>
				</VisualProjectView>
			</LimeniProjectData>
		</FimaProjectContent>
	);
}
