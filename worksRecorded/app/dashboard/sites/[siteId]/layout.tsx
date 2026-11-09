import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DEMO_SITE_ID } from "@/flows/demo/constants";
import { FimaProjectContent } from "@/components/fima/FimaProjectProvider";
import { RegisterProjectWorkspace } from "@/components/projects/ProjectRegistration";
import { getWorkspaceAccess } from "@/components/projects/workspace-access";
import { retainProjectFlow } from "@/components/projects/workspace-store";
import { LimeniProjectData } from "@/flows/default-construction/frontend/LimeniProjectData";
import { RetainedLimeniDiary } from "@/flows/default-construction/frontend/RetainedLimeniDiary";
import { RetainedLimeniForma2 } from "@/flows/default-construction/frontend/RetainedLimeniForma2";
import { VisualProjectView } from "@/flows/default-construction/visual/VisualProjectView";

export default async function ProjectLayout({
	children,
	params,
}: {
	children: ReactNode;
	params: Promise<{ siteId: string }>;
}) {
	const { siteId } = await params;
	if (siteId === DEMO_SITE_ID) redirect("/demo");
	const descriptor = await getWorkspaceAccess(siteId);
	if (retainProjectFlow(descriptor.flowModuleKey)) {
		return <RegisterProjectWorkspace descriptor={descriptor}>{children}</RegisterProjectWorkspace>;
	}
	return (
		<FimaProjectContent key={siteId} siteId={siteId}>
			<LimeniProjectData key={siteId} siteId={siteId}>
				<VisualProjectView key={siteId} siteId={siteId}>
					<RetainedLimeniDiary key={siteId} siteId={siteId}>
						{children}
						<RetainedLimeniForma2 key={siteId} siteId={siteId} />
					</RetainedLimeniDiary>
				</VisualProjectView>
			</LimeniProjectData>
		</FimaProjectContent>
	);
}
