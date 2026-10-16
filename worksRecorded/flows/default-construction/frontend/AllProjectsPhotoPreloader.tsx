"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { ProjectLoadingProgressBar } from "@/components/providers/ProjectLoadingProgressBar";
import { useDiaryImagePreload } from "./useDiaryImagePreload";

export function AllProjectsPhotoPreloader({
	urls,
	language,
	children,
}: {
	urls: string[];
	language: string;
	children: ReactNode;
}) {
	const { progress, loading } = useDiaryImagePreload(urls, "all-projects");
	const lv = language.startsWith("lv");

	if (loading) {
		return (
			<output
				aria-live="polite"
				className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-sm text-muted-foreground"
			>
				<Loader2
					aria-hidden="true"
					className="size-5 motion-safe:animate-spin"
				/>
				{lv ? "Ielādē projektu foto…" : "Loading project photos…"}
				{progress ? (
					<span className="tabular-nums">
						{progress.completed} / {progress.total}
					</span>
				) : null}
				<div className="w-full max-w-sm">
					<ProjectLoadingProgressBar
						label={lv ? "Ielādē projektu foto…" : "Loading project photos…"}
						progress={progress}
					/>
				</div>
			</output>
		);
	}

	return (
		<>
			{progress && progress.failed > 0 ? (
				<output className="block px-4 py-2 text-sm text-muted-foreground">
					{lv
						? "Dažus foto neizdevās ielādēt."
						: "Some photos could not be loaded."}
				</output>
			) : null}
			{children}
		</>
	);
}
