"use client";

import { usePathname } from "next/navigation";
import {
	lazy,
	memo,
	type ReactNode,
	Suspense,
	useEffect,
	useLayoutEffect,
	useState,
} from "react";
import { WorkspaceView } from "@/components/projects/WorkspaceActivity";
import {
	ProjectPreparationScope,
	useProjectPreparationReporter,
	useProjectPreparationReset,
	useVisualProjectPreload,
} from "@/components/providers/ProjectLoadingProgressProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { useLimeniProjectData } from "../frontend/LimeniProjectData";

const VisualView = lazy(() =>
	import("./VisualView").then((module) => ({ default: memo(module.default) })),
);

export function VisualProjectView({
	siteId,
	children,
}: {
	siteId: string;
	children: ReactNode;
}) {
	const pathname = usePathname();
	const projectData = useLimeniProjectData();
	const active = pathname === `/dashboard/sites/${siteId}/izpildshemas`;
	const preload = useVisualProjectPreload(siteId);
	const report = useProjectPreparationReporter(siteId);
	const reset = useProjectPreparationReset(siteId);
	const preloadDrawings =
		preload &&
		(!projectData.enabled ||
			(!!projectData.snapshot && !projectData.snapshot.bootstrap));
	const [visited, setVisited] = useState(active);
	useLayoutEffect(() => {
		reset();
		report("project");
		return reset;
	}, [report, reset]);
	useEffect(() => {
		if (active || preloadDrawings) setVisited(true);
	}, [active, preloadDrawings]);
	useEffect(() => {
		if (projectData.failed && !projectData.snapshot)
			for (const step of [
				"settings",
				"diary",
				"visual-index",
				"visual-drawing",
				"visual-planning",
				"visual-preview",
				"forma2",
			])
				report(step, "error");
	}, [projectData.failed, projectData.snapshot, report]);
	return (
		<ProjectPreparationScope siteId={siteId}>
			{children}
			<section hidden={!active} aria-label="Izpildshēmas">
				{active && projectData.failed && !preloadDrawings ? (
					<output>
						Neizdevās ielādēt izpildshēmas. Savienojums tiks pārbaudīts
						atkārtoti.
					</output>
				) : visited || active || preloadDrawings ? (
					<Suspense fallback={<Skeleton className="h-64 w-full" />}>
						<WorkspaceView active={active}>
							<VisualView
								key={siteId}
								siteId={siteId}
								active={active}
								preload={preload}
							/>
						</WorkspaceView>
					</Suspense>
				) : null}
			</section>
		</ProjectPreparationScope>
	);
}
