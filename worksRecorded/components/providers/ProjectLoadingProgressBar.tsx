"use client";

export type ProjectLoadingProgress = { completed: number; total: number };

export function ProjectLoadingProgressBar({
	label,
	progress,
}: {
	label: string;
	progress?: ProjectLoadingProgress | null;
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
		</div>
	);
}
