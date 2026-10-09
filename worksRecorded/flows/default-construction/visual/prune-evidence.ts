import {
	type VisualEvidence,
	type VisualState,
	visualImageProgress,
} from "./model";

export function pruneVisualEvidence(
	state: VisualState,
	keep: (item: VisualEvidence) => boolean,
): VisualState {
	const evidence = state.evidence.filter(keep);
	if (evidence.length === state.evidence.length) return state;
	const ids = new Set(evidence.map((item) => item.id));
	const imageProgress = visualImageProgress(state)
		.filter((item) => ids.has(item.evidenceId))
		.map((item) =>
			item.status === "running"
				? { ...item, status: "pending" as const, error: null }
				: item,
		);
	const marks = state.marks.filter((item) => ids.has(item.evidenceId));
	const processed = imageProgress.filter(
		(item) => item.status === "complete",
	).length;
	return {
		...state,
		evidence,
		marks,
		...(state.deletedPolygons
			? {
					deletedPolygons: state.deletedPolygons.filter((item) =>
						ids.has(item.evidenceId),
					),
				}
			: {}),
		unlocated: state.unlocated.filter((item) => ids.has(item.evidenceId)),
		imageProgress,
		processed,
		lockedAt: null,
		error: null,
		status:
			processed < evidence.length
				? "paused"
				: marks.length
					? "complete"
					: "unlocated",
		attempts: state.attempts.map((item) =>
			item.status === "running"
				? {
						...item,
						status: "failed",
						endedAt: new Date().toISOString(),
						error: "Diary photo sources changed",
					}
				: item,
		),
	};
}
