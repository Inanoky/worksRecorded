import type { LimeniProjectSnapshot } from "./project-snapshot-store";
import { mergeProjectDelta, type ProjectDelta } from "./project-sync";
import { projectSyncPayload, readProjectParts } from "./project-sync-server";

const snapshot = {
	version: "v1",
	settings: { siteId: "site" },
	index: { drawings: [] },
	diary: { rows: [] },
	config: {},
	forma2: {},
	drawings: [1, 2].map((i) => ({
		drawing: {
			id: `floor-${i}`,
			state: { marks: [{ polygon: [{ x: 0.25, y: 0.75 }] }] },
		},
		planning: { plans: [] },
		preview: { source: `source-${i}` },
	})),
} as unknown as LimeniProjectSnapshot;
it("sends only changed sections and floors, retains unchanged data and removes deleted floors", () => {
	const first = projectSyncPayload(snapshot, "r1") as LimeniProjectSnapshot;
	const changed = {
		...snapshot,
		version: "v2",
		diary: { ...snapshot.diary, rows: [{ id: "new" }] },
		drawings: [
			{ ...snapshot.drawings[0], planning: { plans: [{ id: "new-task" }] } },
		],
	} as unknown as LimeniProjectSnapshot;
	const delta = projectSyncPayload(
		changed,
		"r2",
		first.partVersions,
	) as ProjectDelta;
	expect(Object.keys(delta.changes)).toEqual(["diary"]);
	expect(delta.drawings).toHaveLength(1);
	const merged = mergeProjectDelta(first, delta);
	expect(merged.drawings).toEqual(changed.drawings);
	expect(merged.drawings[0].drawing.state.marks).toEqual(
		snapshot.drawings[0].drawing.state.marks,
	);
	expect(merged.config).toBe(first.config);
	expect(merged.diary).toBe(changed.diary);
	expect(merged.revision).toBe("r2");
	const unchanged = projectSyncPayload(
		changed,
		"r2",
		merged.partVersions,
	) as ProjectDelta;
	expect(unchanged.changes).toEqual({});
	expect(unchanged.drawings).toEqual([]);
});
it("rejects oversized and malformed client fingerprints", () => {
	for (const input of [
		"bad",
		"null",
		"[]",
		JSON.stringify({ diary: "bad" }),
		"x".repeat(12001),
	])
		expect(readProjectParts(input)).toBeUndefined();
	expect(readProjectParts(JSON.stringify({ diary: "a".repeat(64) }))).toEqual({
		diary: "a".repeat(64),
	});
});
