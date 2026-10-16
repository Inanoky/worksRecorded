import { readFimaCollaboration } from "./diary-collaboration";
import {
	mergeFimaCollaboration,
	summarizeFimaCollaboration,
} from "./diary-list-summary";

it("keeps the latest comment, current materials and concurrency version", () => {
	const state = readFimaCollaboration(null);
	state.version = 4;
	state.history = [
		{
			id: "1",
			kind: "comment",
			actorId: "a",
			actorName: "A",
			at: "today",
			text: "First",
		},
		{
			id: "2",
			kind: "comment",
			actorId: "a",
			actorName: "A",
			at: "today",
			text: "Latest",
		},
	];
	expect(summarizeFimaCollaboration(state)).toMatchObject({
		version: 4,
		history: [state.history[1]],
	});
	expect(state.history).toHaveLength(2);
});

it("does not replace full history with a same-version list summary or lose newer BIS snapshots", () => {
	const full = readFimaCollaboration(null);
	full.history = [
		{
			id: "1",
			kind: "status",
			actorId: "a",
			actorName: "A",
			at: "today",
			text: "Status",
		},
	];
	const list = {
		...summarizeFimaCollaboration(full),
		bisMaterials: { fetchedAt: "2026-10-16", entries: [] },
	};
	const merged = mergeFimaCollaboration(full, list);
	expect(merged.history).toHaveLength(1);
	expect(merged.bisMaterials).toEqual(list.bisMaterials);
	expect(
		mergeFimaCollaboration(merged, { ...list, version: 1, status: "approved" })
			.status,
	).toBe("approved");
});
