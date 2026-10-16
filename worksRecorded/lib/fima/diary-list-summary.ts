import type { FimaCollaboration } from "./diary-collaboration";

export function summarizeFimaCollaboration(
	state: FimaCollaboration,
): FimaCollaboration {
	const latest = state.history.findLast((event) => event.kind === "comment");
	return { ...state, history: latest ? [latest] : [] };
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
