import type { ReactNode } from "react";
import { RetainedLimeniDiary } from "@/flows/default-construction/frontend/RetainedLimeniDiary";
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
		<VisualProjectView key={siteId} siteId={siteId}>
			<RetainedLimeniDiary key={siteId} siteId={siteId}>
				{children}
			</RetainedLimeniDiary>
		</VisualProjectView>
	);
}
