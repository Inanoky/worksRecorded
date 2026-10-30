import type { ReactNode } from "react";
import { FimaProjectContent } from "@/components/fima/FimaProjectProvider";
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
