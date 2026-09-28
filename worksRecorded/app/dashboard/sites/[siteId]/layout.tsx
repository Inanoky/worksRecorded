import type { ReactNode } from "react";
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
			{children}
		</VisualProjectView>
	);
}
