import type { LimeniProjectSnapshot } from "./project-snapshot-store";
import {
	applyLocalProjectPatch,
	mergeProjectDelta,
	type ProjectDelta,
} from "./project-sync";
import {
	projectSyncPayload,
	readProjectParts,
	readProjectRowVersions,
} from "./project-sync-server";

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

it("transfers only changed journal records, handles deletion and preserves unchanged row and drawing references", () => {
	const original = {
		...snapshot,
		diary: {
			rows: [
				{ id: "keep", Amounts: 10 },
				{ id: "edit", Amounts: 20 },
				{ id: "delete", Amounts: 30 },
			],
			mediaPhotos: [{ Comment: "original source" }],
		},
	} as unknown as LimeniProjectSnapshot;
	const first = projectSyncPayload(original, "r1") as LimeniProjectSnapshot;
	const next = {
		...original,
		version: "v2",
		diary: {
			...original.diary,
			rows: [
				{ id: "new", Amounts: 5 },
				{ ...original.diary.rows[1], Amounts: 25 },
				original.diary.rows[0],
			],
		},
	} as unknown as LimeniProjectSnapshot;
	const delta = projectSyncPayload(
		next,
		"r2",
		first.partVersions,
		first.diaryRowVersions,
	) as ProjectDelta;
	expect(delta.changes.diary).toBeUndefined();
	expect(delta.diaryRows?.changed.map((row) => row.id)).toEqual([
		"new",
		"edit",
	]);
	expect(delta.diaryRows?.mediaPhotos).toBeUndefined();
	const merged = mergeProjectDelta(first, delta);
	expect(merged.diary).toEqual(next.diary);
	expect(merged.diary.rows[2]).toBe(first.diary.rows[0]);
	expect(merged.diary.mediaPhotos).toBe(first.diary.mediaPhotos);
	expect(merged.drawings[0]).toBe(first.drawings[0]);
});

it("removes deleted media without retransmitting journal rows", () => {
	const first = projectSyncPayload(
		{
			...snapshot,
			diary: { rows: [], mediaPhotos: [{ Comment: "old" }] },
		} as never,
		"r1",
	) as LimeniProjectSnapshot;
	const next = {
		...snapshot,
		diary: { rows: [], mediaPhotos: [] },
	} as unknown as LimeniProjectSnapshot;
	const delta = projectSyncPayload(
		next,
		"r2",
		first.partVersions,
		first.diaryRowVersions,
	) as ProjectDelta;
	expect(delta.diaryRows?.changed).toEqual([]);
	expect(mergeProjectDelta(first, delta).diary.mediaPhotos).toEqual([]);
});

it("rejects an incomplete cached delta instead of silently losing drawings or journal records", () => {
	const first = projectSyncPayload(snapshot, "r1") as LimeniProjectSnapshot;
	const delta = projectSyncPayload(
		snapshot,
		"r2",
		first.partVersions,
		first.diaryRowVersions,
	) as ProjectDelta;
	expect(() => mergeProjectDelta({ ...first, drawings: [] }, delta)).toThrow(
		"drawing cache",
	);
	expect(() =>
		mergeProjectDelta(first, {
			...delta,
			diaryRows: { changed: [], order: ["missing"] },
		}),
	).toThrow("journal cache");
});

it("invalidates local row and section fingerprints so a saved edit is reconciled with the server", () => {
	const first = projectSyncPayload(
		{
			...snapshot,
			diary: { rows: [{ id: "row", Amounts: 10 }], mediaPhotos: [] },
		} as never,
		"r1",
	) as LimeniProjectSnapshot;
	const updated = applyLocalProjectPatch(
		first,
		(current) => ({
			...current,
			diary: {
				...current.diary,
				rows: [{ ...current.diary.rows[0], Amounts: 20 }],
			},
		}),
		"local",
	);
	expect(updated.version).toBe("local");
	expect(updated.revision).toBeUndefined();
	expect(updated.partVersions?.diary).toBeUndefined();
	expect(updated.partVersions?.config).toBe(first.partVersions?.config);
	expect(updated.diaryRowVersions?.row).toBeUndefined();
	const delta = projectSyncPayload(
		first,
		"r1",
		updated.partVersions,
		updated.diaryRowVersions,
	) as ProjectDelta;
	expect(mergeProjectDelta(updated, delta).diary).toEqual(first.diary);
	expect(first.diary.rows[0].Amounts).toBe(10);
});

it("validates record inventories independently of header limits", () => {
	for (const value of [
		null,
		[],
		"bad",
		{ row: "bad" },
		{ "": "a".repeat(64) },
		{ ["x".repeat(201)]: "a".repeat(64) },
	])
		expect(readProjectRowVersions(value)).toBeUndefined();
	const valid = Object.fromEntries(
		Array.from({ length: 500 }, (_, i) => [`row-${i}`, "a".repeat(64)]),
	);
	expect(readProjectRowVersions(valid)).toEqual(valid);
	expect(readProjectRowVersions({})).toEqual({});
	expect(
		readProjectRowVersions(
			Object.fromEntries(
				Array.from({ length: 10001 }, (_, i) => [`row-${i}`, "a".repeat(64)]),
			),
		),
	).toBeUndefined();
});
it("keeps drawing invalidation explicit so the next delta restores a complete drawing order", () => {
	const first = projectSyncPayload(snapshot, "r1") as LimeniProjectSnapshot;
	const next = applyLocalProjectPatch(
		first,
		(current) => ({
			...current,
			drawings: current.drawings.map((item, index) =>
				index ? item : { ...item, preview: null },
			),
		}),
		"local",
	);
	expect(next.partVersions?.index).toBeUndefined();
	expect(next.partVersions?.["drawing:floor-1"]).toBeUndefined();
});
it("accepts larger drawing inventories in the negotiated request body while bounding legacy headers", () => {
	const parts = JSON.stringify(
		Object.fromEntries(
			Array.from({ length: 200 }, (_, i) => [`drawing:${i}`, "a".repeat(64)]),
		),
	);
	expect(readProjectParts(parts)).toBeUndefined();
	expect(Object.keys(readProjectParts(parts, true) ?? {})).toHaveLength(200);
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
