"use client";

import { Loader2 } from "lucide-react";
import {
	type ProjectLoadingProgress,
	ProjectLoadingProgressBar,
} from "./ProjectLoadingProgressBar";
import { useProjectLoadingProgress } from "./ProjectLoadingProgressProvider";

export function ProjectOpeningOverlay({
	label,
	progress,
}: {
	label: string;
	progress?: ProjectLoadingProgress | null;
}) {
	const showProgress = useProjectLoadingProgress();
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
					<ProjectLoadingProgressBar label={label} progress={progress} />
				) : null}
			</div>
		</output>
	);
}
