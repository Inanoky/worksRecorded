"use client";

import { usePathname } from "next/navigation";
import {
	lazy,
	type ReactNode,
	Suspense,
	useEffect,
	useLayoutEffect,
	useState,
} from "react";
import { ProjectLoadingProgressBar } from "@/components/providers/ProjectLoadingProgressBar";
import {
	ProjectPreparationScope,
	useProjectPreparation,
	useProjectPreparationReporter,
	useProjectPreparationReset,
	useVisualProjectPreload,
} from "@/components/providers/ProjectLoadingProgressProvider";
import { Skeleton } from "@/components/ui/skeleton";

const VisualView = lazy(() => import("./VisualView"));

export function VisualProjectView({
	siteId,
	children,
}: {
	siteId: string;
	children: ReactNode;
}) {
	const pathname = usePathname();
	const active = pathname === `/dashboard/sites/${siteId}/izpildshemas`;
	const preload = useVisualProjectPreload(siteId);
	const progress = useProjectPreparation(siteId);
	const report = useProjectPreparationReporter(siteId);
	const reset = useProjectPreparationReset(siteId);
	const [visited, setVisited] = useState(active || preload);
	useLayoutEffect(() => {
		reset();
		report("project");
		return reset;
	}, [report, reset]);
	useEffect(() => {
		if (active || preload) setVisited(true);
	}, [active, preload]);
	return (
		<ProjectPreparationScope siteId={siteId}>
			{preload &&
			pathname === `/dashboard/sites/${siteId}/dashboard` &&
			progress &&
			progress.steps?.some((step) => step.status === "pending") ? (
				<details className="mb-3 rounded-lg border bg-background px-4 py-2">
					<summary className="cursor-pointer text-xs">
						Projekta sagatavošana ·{" "}
						{Math.round((progress.completed / progress.total) * 100)}%
					</summary>
					<ProjectLoadingProgressBar
						label="Projekta sagatavošana"
						progress={progress}
					/>
				</details>
			) : null}
			{children}
			<section hidden={!active} aria-label="Izpildshēmas">
				{visited || active ? (
					<Suspense fallback={<Skeleton className="h-64 w-full" />}>
						<VisualView
							key={siteId}
							siteId={siteId}
							active={active}
							preload={preload}
						/>
					</Suspense>
				) : null}
			</section>
		</ProjectPreparationScope>
	);
}
