"use client";

import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { projectIdFromHref } from "@/components/projects/workspace-store";
import { cn } from "@/lib/utils/utils";
import {
	type ProjectLoadingProgress,
	ProjectLoadingProgressBar,
} from "./ProjectLoadingProgressBar";
import {
	useFimaProjectPreload,
	useProjectLoadingProgress,
	useProjectPreparation,
	useProjectPreparationManaged,
	useVisualProjectPreload,
} from "./ProjectLoadingProgressProvider";

export function ProjectOpeningOverlay({
	label,
	progress,
	siteId,
	children,
	primary = false,
}: {
	label: string;
	progress?: ProjectLoadingProgress | null;
	siteId?: string;
	children?: ReactNode;
	primary?: boolean;
}) {
	const enabled = useProjectLoadingProgress();
	const visualPreload = useVisualProjectPreload(siteId);
	const showProgress = enabled || visualPreload;
	const pathname = usePathname();
	const routeSiteId = projectIdFromHref(pathname ?? "") ?? undefined;
	const fimaProject = useFimaProjectPreload(siteId ?? routeSiteId);
	const preparation = useProjectPreparation(
		siteId ?? (fimaProject ? routeSiteId : undefined),
	);
	const managed = useProjectPreparationManaged();
	if (managed && !primary) return null;
	return (
		<output
			className={cn(
				"flex items-center justify-center p-6",
				fimaProject
					? "my-4 min-h-48"
					: "fixed inset-0 z-[100] bg-background/85 backdrop-blur-sm",
			)}
			aria-live="polite"
			aria-label={label}
		>
			<div
				className={`flex min-w-64 flex-col items-center gap-4 rounded-xl border bg-card p-8 text-card-foreground shadow-xl ${showProgress ? "w-full max-w-sm" : ""}`}
			>
				{!visualPreload ? (
					<Loader2
						className="size-10 motion-safe:animate-spin text-primary"
						aria-hidden="true"
					/>
				) : null}
				<p
					className={
						visualPreload ? "sr-only" : "text-center text-base font-medium"
					}
				>
					{label}
				</p>
				{showProgress ? (
					<ProjectLoadingProgressBar
						label={label}
						compact={visualPreload}
						progress={
							progress ??
							preparation ?? {
								completed: 0,
								total: 1,
								steps: [{ label: "Projekta datu ielāde", status: "pending" }],
							}
						}
					/>
				) : null}
				{children}
			</div>
		</output>
	);
}
