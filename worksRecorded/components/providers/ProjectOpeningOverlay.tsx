"use client";

import { Loader2 } from "lucide-react";
import {
	type ProjectLoadingProgress,
	ProjectLoadingProgressBar,
} from "./ProjectLoadingProgressBar";
import {
	useProjectLoadingProgress,
	useProjectPreparation,
	useVisualProjectPreload,
} from "./ProjectLoadingProgressProvider";

export function ProjectOpeningOverlay({
	label,
	progress,
	siteId,
}: {
	label: string;
	progress?: ProjectLoadingProgress | null;
	siteId?: string;
}) {
	const enabled = useProjectLoadingProgress();
	const visualPreload = useVisualProjectPreload(siteId);
	const showProgress = enabled || visualPreload;
	const preparation = useProjectPreparation(siteId);
	return (
		<output
			className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 p-6 backdrop-blur-sm"
			aria-live="polite"
			aria-label={label}
		>
			<div
				className={`flex min-w-64 flex-col items-center gap-4 rounded-xl border bg-card p-8 text-card-foreground shadow-xl ${showProgress ? "w-full max-w-sm" : ""}`}
			>
				<Loader2
					className="size-10 motion-safe:animate-spin text-primary"
					aria-hidden="true"
				/>
				<p className="text-center text-base font-medium">{label}</p>
				{showProgress ? (
					<ProjectLoadingProgressBar
						label={label}
						progress={
							preparation ??
							progress ?? {
								completed: 0,
								total: 1,
								steps: [{ label: "Projekta datu ielāde", status: "pending" }],
							}
						}
					/>
				) : null}
			</div>
		</output>
	);
}
