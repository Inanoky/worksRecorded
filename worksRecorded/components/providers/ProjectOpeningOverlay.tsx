"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import {
	type ProjectLoadingProgress,
	ProjectLoadingProgressBar,
} from "./ProjectLoadingProgressBar";
import {
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
	const preparation = useProjectPreparation(siteId);
	const managed = useProjectPreparationManaged();
	if (managed && !primary) return null;
	return (
		<output
			className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 p-6 backdrop-blur-sm"
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
