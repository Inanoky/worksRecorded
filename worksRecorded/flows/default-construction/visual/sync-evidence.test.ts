import type { VisualEvidence, VisualState } from "./model";
import { syncVisualEvidence } from "./sync-evidence";

const evidence: VisualEvidence = {
	id: "old",
	recordId: "record",
	photoUrl: "https://example.com/photo.jpg",
	work: "Papildu darbi",
	location: "1. stāvs",
	description: "Smilts 61 m2",
	date: "2026-10-01T12:00:00Z",
	amount: 61,
	unit: "m2",
};

function savedState(): VisualState {
	return {
		version: 1,
		location: "1. stāvs",
		status: "complete",
		pageCount: 1,
		processed: 2,
		evidence: [evidence, { ...evidence, id: "unchanged", recordId: "other" }],
		marks: ["old", "unchanged"].map((id) => ({
			id: `mark-${id}`,
			evidenceId: id,
			layer: "other",
			page: 1,
			polygon: [
				{ x: 0, y: 0 },
				{ x: 1, y: 0 },
				{ x: 1, y: 1 },
			],
			confidence: 0.8,
			anchors: ["A", "B"],
			explanation: "Located",
			editedAt: "2026-10-01",
			editedBy: "editor",
		})),
		unlocated: [],
		attempts: [],
		error: null,
		lockedAt: null,
	};
}

it("protects manually adjusted zones and flags changed sources once in automatic sync", () => {
	const previous = savedState();
	const current = [
		{ ...evidence, work: "XPS", description: "Changed" },
		previous.evidence[1],
	];
	const result = syncVisualEvidence(previous, current, () => "new", true);
	expect(result).toMatchObject({
		updatedCount: 1,
		analysisCount: 0,
		reviewCount: 1,
	});
	expect(result.state.evidence[0]).toMatchObject({
		id: "old",
		reviewRequired: true,
		work: "XPS",
	});
	expect(result.state.marks[0]).toMatchObject({
		id: "mark-old",
		layer: "xps",
		editedAt: previous.marks[0].editedAt,
		polygon: previous.marks[0].polygon,
	});
	expect(
		syncVisualEvidence(result.state, current, () => "new", true),
	).toMatchObject({ analysisCount: 0, changed: false, reviewCount: 1 });
	expect(previous.evidence[0].reviewRequired).toBeUndefined();
});

it("keeps deleted polygons absent on refresh, including the last polygon, and flags changed sources for review", () => {
	const previous = savedState();
	const removed = previous.marks[0];
	previous.marks = previous.marks.slice(1);
	previous.deletedPolygons = [
		{
			markId: removed.id,
			evidenceId: removed.evidenceId,
			polygon: removed.polygon,
			deletedAt: "2026-10-09",
			deletedBy: "user",
		},
	];
	const unchanged = syncVisualEvidence(
		previous,
		previous.evidence,
		() => "new",
		true,
	);
	expect(unchanged.analysisCount).toBe(0);
	expect(unchanged.state.marks).toEqual(previous.marks);
	expect(unchanged.state.deletedPolygons).toEqual(previous.deletedPolygons);
	const changed = syncVisualEvidence(
		unchanged.state,
		[{ ...evidence, description: "Updated" }, previous.evidence[1]],
		() => "new",
		true,
	);
	expect(changed).toMatchObject({
		analysisCount: 0,
		reviewCount: 1,
		updatedCount: 1,
	});
	expect(changed.state.marks).toEqual(previous.marks);
	expect(changed.state.evidence[0].reviewRequired).toBe(true);
	const pruned = syncVisualEvidence(
		previous,
		[previous.evidence[1]],
		() => "new",
		true,
	);
	expect(pruned.state.deletedPolygons).toEqual([]);
});

it("keeps last valid zones while queuing changed unedited sources and removes deleted sources", () => {
	const previous = savedState();
	delete previous.marks[0].editedAt;
	const result = syncVisualEvidence(
		previous,
		[{ ...evidence, amount: 70 }],
		() => "new",
		true,
	);
	expect(result).toMatchObject({
		updatedCount: 1,
		removedCount: 1,
		analysisCount: 1,
		reviewCount: 0,
	});
	expect(result.state.evidence[0].id).toBe("old");
	expect(result.state.marks).toEqual([previous.marks[0]]);
	expect(result.state.imageProgress).toEqual([
		{ evidenceId: "old", status: "pending", error: null },
	]);
	expect(
		syncVisualEvidence(
			result.state,
			[{ ...evidence, amount: 70 }],
			() => "new",
			true,
		).analysisCount,
	).toBe(0);
});

it.each([
	{ work: "Smilts līdzināšana 20-30mm" },
	{ description: "Updated instructions about the work" },
	{ date: "2026-10-02T12:00:00Z" },
	{ amount: 50 },
	{ unit: "m3" },
])(
	"requeues an edited legacy record and preserves the unrelated manual polygon: %j",
	(patch) => {
		const previous = savedState();
		const snapshot = JSON.stringify(previous);
		const current = [{ ...evidence, ...patch }, previous.evidence[1]];
		const result = syncVisualEvidence(previous, current, () => "new");
		expect(result).toMatchObject({
			addedCount: 0,
			updatedCount: 1,
			removedCount: 0,
			changed: true,
		});
		expect(result.state.marks).toEqual([previous.marks[1]]);
		expect(result.state.evidence).toEqual([
			previous.evidence[1],
			{ ...current[0], id: "record:new" },
		]);
		expect(result.state).toMatchObject({
			processed: 1,
			status: "paused",
			lockedAt: null,
			error: null,
		});
		expect(result.state.imageProgress).toEqual([
			{ evidenceId: "unchanged", status: "complete", error: null },
			{ evidenceId: "record:new", status: "pending", error: null },
		]);
		expect(JSON.stringify(previous)).toBe(snapshot);
		const again = syncVisualEvidence(result.state, current, () => "another");
		expect(again).toMatchObject({
			addedCount: 0,
			updatedCount: 0,
			removedCount: 0,
			changed: false,
		});
	},
);

it("detects record revisions outside the displayed evidence fields", () => {
	const previous = savedState();
	previous.evidence = previous.evidence.map((item) => ({
		...item,
		sourceRevision: "before",
	}));
	const current = previous.evidence.map((item) => ({
		...item,
		sourceRevision: item.recordId === "record" ? "after" : "before",
	}));
	expect(syncVisualEvidence(previous, current, () => "new").updatedCount).toBe(
		1,
	);
});

it("baselines unchanged legacy snapshots without discarding zones or triggering AI", () => {
	const previous = savedState();
	const current = previous.evidence.map((item) => ({
		...item,
		sourceRevision: "revision",
	}));
	const result = syncVisualEvidence(previous, current, () => "unused");
	expect(result).toMatchObject({
		changed: true,
		addedCount: 0,
		updatedCount: 0,
		removedCount: 0,
	});
	expect(result.state.marks).toEqual(previous.marks);
	expect(result.state.status).toBe("complete");
	expect(
		syncVisualEvidence(result.state, current, () => "unused").changed,
	).toBe(false);
});

it("requeues every photo of a changed record without touching another record using the same URL", () => {
	const previous = savedState();
	previous.evidence.push({
		...evidence,
		id: "second-photo",
		photoUrl: "https://example.com/two.jpg",
	});
	previous.unlocated = [{ evidenceId: "second-photo", reason: "Not found" }];
	previous.processed = 3;
	let id = 0;
	const result = syncVisualEvidence(
		previous,
		previous.evidence.map((item) =>
			item.recordId === "record" ? { ...item, work: "XPS" } : item,
		),
		() => `${++id}`,
	);
	expect(result.updatedCount).toBe(2);
	expect(new Set(result.state.evidence.map((item) => item.id)).size).toBe(3);
	expect(result.state.marks).toEqual([previous.marks[1]]);
	expect(result.state.unlocated).toEqual([]);
});

it("removes moved or archived sources, and treats them as new at their destination", () => {
	const previous = savedState();
	const result = syncVisualEvidence(
		previous,
		[previous.evidence[1]],
		() => "new",
	);
	expect(result).toMatchObject({
		removedCount: 1,
		updatedCount: 0,
		addedCount: 0,
	});
	expect(result.state.marks).toEqual([previous.marks[1]]);
	const destination = syncVisualEvidence(
		{ ...previous, evidence: [], marks: [], processed: 0 },
		[{ ...evidence, location: "2. stāvs" }],
		() => "new",
	);
	expect(destination).toMatchObject({ addedCount: 1, updatedCount: 0 });
});
