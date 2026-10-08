import {
	type VisualEvidence,
	type VisualState,
	visualImageProgress,
	VISUAL_MAX_PHOTOS,
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
		changed: JSON.stringify(state) !== JSON.stringify(previous),
	};
}
