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

it("keeps only the latest badge change and comment in the list while preserving full stored history", () => {
	const event = {
		id: "first-badge",
		kind: "status" as const,
		actorId: "a",
		actorName: "Anna",
		at: "2026-10-19T08:00:00Z",
		text: "Rīcība: Labot",
	};
	const comment = {
		...event,
		id: "comment",
		kind: "comment" as const,
		text: "Comment",
	};
	const latest = {
		...event,
		id: "last-badge",
		actorName: "Jānis",
		status: null,
		previousStatus: "needs_changes" as const,
	};
	const full = {
		...readFimaCollaboration(null),
		history: [event, comment, latest],
	};
	expect(summarizeFimaCollaboration(full).history).toEqual([comment, latest]);
	expect(full.history).toHaveLength(3);
});
