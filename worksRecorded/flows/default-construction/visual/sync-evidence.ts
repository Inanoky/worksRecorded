import {
	VISUAL_MAX_PHOTOS,
	type VisualEvidence,
	type VisualState,
	visualImageProgress,
	workLayer,
} from "./model";
import { pruneVisualEvidence } from "./prune-evidence";

function evidenceKey(item: VisualEvidence) {
	return JSON.stringify([item.recordId, item.photoUrl]);
}

function evidenceChanged(previous: VisualEvidence, current: VisualEvidence) {
	const fields = [
		"recordId",
		"photoUrl",
		"work",
		"location",
		"description",
		"date",
		"amount",
		"unit",
	] as const;
	return (
		fields.some((field) => previous[field] !== current[field]) ||
		(previous.sourceRevision !== undefined &&
			previous.sourceRevision !== current.sourceRevision)
	);
}

export function syncVisualEvidence(
	previous: VisualState,
	current: VisualEvidence[],
	createId: () => string,
	preserveResults = false,
) {
	if (current.length > VISUAL_MAX_PHOTOS)
		throw new Error(
			`Lokācijai ir vairāk nekā ${VISUAL_MAX_PHOTOS} attēlu. Esošie rezultāti nav mainīti.`,
		);
	const currentByKey = new Map(
		current.map((item) => [evidenceKey(item), item]),
	);
	const previousByKey = new Map(
		previous.evidence.map((item) => [evidenceKey(item), item]),
	);
	const changedKeys = new Set(
		previous.evidence
			.filter((item) => {
				const next = currentByKey.get(evidenceKey(item));
				return next && evidenceChanged(item, next);
			})
			.map(evidenceKey),
	);
	const removedCount = previous.evidence.filter(
		(item) => !currentByKey.has(evidenceKey(item)),
	).length;
	if (preserveResults) {
		const state = pruneVisualEvidence(previous, (item) =>
			currentByKey.has(evidenceKey(item)),
		);
		const progress = new Map(
			visualImageProgress(state).map((item) => [item.evidenceId, item]),
		);
		let analysisCount = 0;
		const ordered = [
			...state.evidence.map((item) => currentByKey.get(evidenceKey(item))!),
			...current.filter((item) => !previousByKey.has(evidenceKey(item))),
		];
		const evidence = ordered.map((item) => {
			const old = previousByKey.get(evidenceKey(item));
			const id = old?.id ?? `${item.recordId}:${createId()}`;
			const changed = changedKeys.has(evidenceKey(item));
			const manual =
				changed &&
				(state.marks.some((mark) => mark.evidenceId === id && mark.editedAt) ||
					state.deletedPolygons?.some((item) => item.evidenceId === id));
			if (!old || (changed && !manual)) {
				progress.set(id, { evidenceId: id, status: "pending", error: null });
				analysisCount++;
			}
			return {
				...item,
				id,
				...(manual || old?.reviewRequired ? { reviewRequired: true } : {}),
			};
		});
		const byId = new Map(evidence.map((item) => [item.id, item]));
		const next: VisualState = {
			...state,
			evidence,
			marks: state.marks.map((mark) => {
				const source = byId.get(mark.evidenceId)!;
				return { ...mark, layer: workLayer(source.work) };
			}),
			...(state.imageProgress || analysisCount
				? { imageProgress: evidence.map((item) => progress.get(item.id)!) }
				: {}),
			processed: [...progress.values()].filter(
				(item) => item.status === "complete",
			).length,
			...(analysisCount
				? { status: "paused", lockedAt: null, error: null }
				: {}),
		};
		return {
			state: next,
			addedCount: current.filter(
				(item) => !previousByKey.has(evidenceKey(item)),
			).length,
			updatedCount: changedKeys.size,
			removedCount,
			analysisCount,
			reviewCount: evidence.filter((item) => item.reviewRequired).length,
			changed: JSON.stringify(next) !== JSON.stringify(previous),
		};
	}
	let state = pruneVisualEvidence(
		previous,
		(item) =>
			currentByKey.has(evidenceKey(item)) &&
			!changedKeys.has(evidenceKey(item)),
	);
	const retained = state.evidence.map((item) => ({
		...currentByKey.get(evidenceKey(item))!,
		id: item.id,
	}));
	const queued = current
		.filter(
			(item) =>
				!previousByKey.has(evidenceKey(item)) ||
				changedKeys.has(evidenceKey(item)),
		)
		.map((item) => ({ ...item, id: `${item.recordId}:${createId()}` }));
	state = { ...state, evidence: retained };
	if (queued.length) {
		state = {
			...state,
			imageProgress: [
				...visualImageProgress(state),
				...queued.map((item) => ({
					evidenceId: item.id,
					status: "pending" as const,
					error: null,
				})),
			],
			evidence: [...retained, ...queued],
			status: "paused",
			lockedAt: null,
			error: null,
		};
	}
	return {
		state,
		addedCount: queued.length - changedKeys.size,
		updatedCount: changedKeys.size,
		removedCount,
		analysisCount: queued.length,
		reviewCount: 0,
		changed: JSON.stringify(state) !== JSON.stringify(previous),
	};
}
