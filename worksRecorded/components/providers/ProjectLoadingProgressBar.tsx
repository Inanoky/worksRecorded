"use client";

export type ProjectLoadingProgress = {
	completed: number;
	total: number;
	steps?: Array<{
		label: string;
		status: "pending" | "done" | "error";
		completed?: number;
		total?: number;
	}>;
};

export function ProjectLoadingProgressBar({
	label,
	progress,
	compact = false,
}: {
	label: string;
	progress?: ProjectLoadingProgress | null;
	compact?: boolean;
}) {
	const value =
		progress &&
		Number.isFinite(progress.completed) &&
		Number.isFinite(progress.total) &&
		progress.total > 0
			? Math.min(100, Math.max(0, (progress.completed / progress.total) * 100))
			: undefined;
	return (
		<div className="w-full">
			<p className="mb-2 text-right text-sm tabular-nums" aria-live="polite">
				{value === undefined ? "0%" : `${Math.round(value)}%`}
			</p>
			<progress
				className="sr-only"
				aria-label={label}
				value={value}
				max={100}
			/>
			<div
				aria-hidden="true"
				className="relative h-2 w-full overflow-hidden rounded-full bg-primary/15"
			>
				<div
					className={
						value === undefined
							? "project-loading-bar-indeterminate h-full rounded-full bg-primary"
							: "h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
					}
					style={value === undefined ? undefined : { width: `${value}%` }}
				/>
			</div>
			{!compact && progress?.steps ? (
				<ol className="mt-3 space-y-1 text-left text-xs">
					{progress.steps.map((step, index) => (
						<li
							key={step.label}
							className={
								step.status === "done"
									? "text-primary"
									: step.status === "error"
										? "text-destructive"
										: "text-muted-foreground"
							}
						>
							{index + 1}. {step.label} ·{" "}
							{step.total ? `${step.completed ?? 0}/${step.total} · ` : ""}
							{step.status === "done"
								? "Gatavs"
								: step.status === "error"
									? "Neizdevās ielādēt"
									: "Gaida"}
						</li>
					))}
				</ol>
			) : null}
		</div>
	);
}
