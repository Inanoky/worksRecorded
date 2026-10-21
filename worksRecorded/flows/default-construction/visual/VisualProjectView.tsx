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
import {
	ProjectPreparationScope,
	useProjectPreparation,
	useProjectPreparationReporter,
	useProjectPreparationReset,
	useVisualProjectPreload,
} from "@/components/providers/ProjectLoadingProgressProvider";
import { ProjectOpeningOverlay } from "@/components/providers/ProjectOpeningOverlay";
import { Button } from "@/components/ui/button";
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
	const [opened, setOpened] = useState(!preload);
	const requiredSteps = progress?.steps?.filter(
		(step) =>
			pathname === `/dashboard/sites/${siteId}/dashboard` ||
			!["Projekta iestatījumi", "Būvdarbu žurnāls"].includes(step.label),
	);
	const pending =
		!requiredSteps || requiredSteps.some((step) => step.status === "pending");
	const failed = requiredSteps?.some((step) => step.status === "error");
	const preparing = preload && !opened;
	useLayoutEffect(() => {
		reset();
		report("project");
		return reset;
	}, [report, reset]);
	useEffect(() => {
		if (active || preload) setVisited(true);
	}, [active, preload]);
	useEffect(() => {
		if (!pending && !failed) setOpened(true);
	}, [pending, failed]);
	return (
		<ProjectPreparationScope siteId={siteId}>
			<div inert={preparing || undefined} aria-hidden={preparing || undefined}>
				{children}
			</div>
			<section
				hidden={!active}
				inert={preparing || undefined}
				aria-hidden={preparing || undefined}
				aria-label="Izpildshēmas"
			>
				{visited || active ? (
					<Suspense fallback={<Skeleton className="h-64 w-full" />}>
						<VisualView
							key={siteId}
							siteId={siteId}
							active={active && !preparing}
							preload={preload}
						/>
					</Suspense>
				) : null}
			</section>
			{preparing ? (
				<ProjectOpeningOverlay
					label="Sagatavo projektu…"
					siteId={siteId}
					progress={
						requiredSteps
							? {
									total: requiredSteps.length,
									completed: requiredSteps.reduce(
										(sum, step) =>
											sum +
											(step.status === "pending"
												? step.total
													? (step.completed ?? 0) / step.total
													: 0
												: 1),
										0,
									),
									steps: requiredSteps,
								}
							: progress
					}
				>
					{!pending && failed ? (
						<div className="flex flex-col gap-2">
							<p className="text-sm text-destructive">
								Daļu datu neizdevās ielādēt.
							</p>
							<Button onClick={() => window.location.reload()}>
								Mēģināt vēlreiz
							</Button>
							<Button variant="outline" onClick={() => setOpened(true)}>
								Atvērt ar pieejamajiem datiem
							</Button>
						</div>
					) : null}
				</ProjectOpeningOverlay>
			) : null}
		</ProjectPreparationScope>
	);
}
