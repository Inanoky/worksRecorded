import type { FimaCollaboration } from "./diary-collaboration";

export function summarizeFimaCollaboration(
	state: FimaCollaboration,
): FimaCollaboration {
	const latest = state.history.findLast((event) => event.kind === "comment");
	const latestStatus = state.history.findLast(
		(event) => event.kind === "status",
	);
	return {
		...state,
		history: state.history.filter(
			(event) => event === latest || event === latestStatus,
		),
	};
}

export function mergeFimaCollaboration(
	current: FimaCollaboration | undefined,
	incoming: FimaCollaboration,
): FimaCollaboration {
	if (!current) return incoming;
	const latest =
		current.version > incoming.version ||
		(current.version === incoming.version &&
			current.history.length > incoming.history.length)
			? current
			: incoming;
	const bisMaterials =
		(current.bisMaterials?.fetchedAt ?? "") >
		(incoming.bisMaterials?.fetchedAt ?? "")
			? current.bisMaterials
			: incoming.bisMaterials;
	return { ...latest, bisMaterials };
}
