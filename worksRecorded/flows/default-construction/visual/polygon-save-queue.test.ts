import type { VisualDrawing } from "./model";
import type { PolygonEdit, PolygonSaveResponse } from "./polygon-edit";
import {
	applyPolygonSave,
	PolygonSaveQueue,
	projectPolygonSaves,
} from "./polygon-save-queue";

const polygon = [
	{ x: 0.1, y: 0.1 },
	{ x: 0.4, y: 0.1 },
	{ x: 0.4, y: 0.4 },
];
const edit: PolygonEdit = {
	markId: "one",
	expectedPolygon: polygon,
	polygon: [{ x: 0.15, y: 0.1 }, ...polygon.slice(1)],
	mutationId: "11111111-1111-4111-8111-111111111111",
};
const second = {
	...edit,
	markId: "two",
	mutationId: "22222222-2222-4222-8222-222222222222",
};
const drawing: VisualDrawing = {
	id: "drawing",
	name: "plan.pdf",
	createdAt: "2026-10-13",
	latestDiaryDate: "2026-10-13",
	state: {
		version: 1,
		location: "1. stāvs",
		status: "complete",
		pageCount: 1,
		processed: 0,
		evidence: [],
		unlocated: [],
		attempts: [],
		lockedAt: null,
		error: null,
		marks: ["one", "two"].map((id) => ({
			id,
			evidenceId: "photo",
			layer: "xps",
			polygon,
			page: 1,
			confidence: 0.9,
			explanation: "Zone",
			anchors: ["A", "B"],
		})),
	},
};
const success = (
	drawingId: string,
	value: PolygonEdit,
): PolygonSaveResponse => ({
	ok: true,
	result: {
		drawingId,
		markId: value.markId,
		polygon: value.polygon,
		mutationId: value.mutationId ?? null,
		editedBy: "user",
		editedAt: "2026-10-13T12:00:00Z",
	},
});
const tick = async () => {
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
};

it("queues saves per drawing and acknowledges only the saved polygon", async () => {
	let finish!: (value: PolygonSaveResponse) => void;
	const save = jest
		.fn()
		.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		)
		.mockResolvedValue(success("drawing", second));
	const onSaved = jest.fn();
	const queue = new PolygonSaveQueue(save, onSaved);
	queue.enqueue("drawing", edit);
	queue.enqueue("drawing", second);
	expect(save).toHaveBeenCalledTimes(1);
	expect(queue.getSnapshot().items.map((item) => item.status)).toEqual([
		"saving",
		"queued",
	]);
	expect(queue.getSnapshot().lastSavedAt).toBeNull();
	finish(success("drawing", edit));
	await tick();
	expect(save).toHaveBeenCalledTimes(2);
	expect(onSaved).toHaveBeenCalledTimes(2);
	expect(queue.hasPending()).toBe(false);
	expect(queue.getSnapshot().lastSavedAt).not.toBeNull();
});

it("retains a failed edit, continues other zones, and retries with the same mutation ID", async () => {
	const save = jest
		.fn()
		.mockRejectedValueOnce(new Error("Network"))
		.mockResolvedValueOnce(success("drawing", second))
		.mockResolvedValueOnce(success("drawing", edit));
	const onSaved = jest.fn();
	const queue = new PolygonSaveQueue(save, onSaved);
	queue.enqueue("drawing", edit);
	queue.enqueue("drawing", second);
	await tick();
	expect(queue.getSnapshot().items).toHaveLength(1);
	expect(queue.getSnapshot().items[0].status).toBe("failed");
	expect(
		projectPolygonSaves(drawing, queue.getSnapshot().items)?.state.marks[0]
			.polygon,
	).toEqual(edit.polygon);
	expect(onSaved).toHaveBeenCalledTimes(1);
	queue.retry("drawing", "one");
	await tick();
	expect(save).toHaveBeenLastCalledWith("drawing", edit);
	expect(queue.hasPending()).toBe(false);
});

it("prevents a second edit or discard of a polygon that is still saving", () => {
	const save = jest.fn(() => new Promise<PolygonSaveResponse>(() => {}));
	const queue = new PolygonSaveQueue(save, jest.fn());
	queue.enqueue("drawing", edit);
	expect(() => queue.enqueue("drawing", edit)).toThrow("vēl nav saglabāts");
	queue.discard("drawing", "one");
	expect(queue.hasPending()).toBe(true);
	queue.retry("drawing", "one");
	expect(save).toHaveBeenCalledTimes(1);
});

it("keeps conflicts visible until explicitly discarded without overwriting server data", async () => {
	const save = jest.fn().mockResolvedValue({
		ok: false,
		code: "conflict",
		error: "Zona jau ir mainīta.",
	});
	const onSaved = jest.fn();
	const queue = new PolygonSaveQueue(save, onSaved);
	queue.enqueue("drawing", edit);
	await tick();
	expect(queue.getSnapshot().items[0]).toMatchObject({
		status: "failed",
		code: "conflict",
	});
	expect(onSaved).not.toHaveBeenCalled();
	queue.discard("drawing", "one");
	expect(projectPolygonSaves(drawing, queue.getSnapshot().items)).toBe(drawing);
	expect(queue.getSnapshot().lastSavedAt).toBeNull();
});

it("stores only geometry and restores interrupted saves for manual retry, not automatic replay", async () => {
	const persist = jest.fn();
	const save = jest.fn(() => new Promise<PolygonSaveResponse>(() => {}));
	const queue = new PolygonSaveQueue(save, jest.fn());
	queue.attachStorage(null, persist);
	queue.enqueue("drawing", edit);
	const stored = persist.mock.calls.at(-1)?.[0] as string;
	expect(JSON.parse(stored)).toEqual({
		version: 1,
		items: [{ drawingId: "drawing", edit }],
	});
	const retrySave = jest.fn().mockResolvedValue(success("drawing", edit));
	const restored = new PolygonSaveQueue(retrySave, jest.fn());
	restored.attachStorage(stored, persist);
	expect(restored.getSnapshot().items[0].status).toBe("failed");
	expect(retrySave).not.toHaveBeenCalled();
	restored.retry("drawing", "one");
	await tick();
	expect(retrySave).toHaveBeenCalledWith("drawing", edit);
	expect(persist).toHaveBeenLastCalledWith(null);
});

it("patches only existing geometry, preserves newer sources and siblings, and never resurrects deleted zones", () => {
	const response = success("drawing", edit);
	if (!response.ok) throw new Error("Missing result");
	const patched = applyPolygonSave(drawing, response.result);
	expect(patched.state.marks[0].polygon).toEqual(edit.polygon);
	expect(patched.state.marks[1]).toBe(drawing.state.marks[1]);
	expect(patched.state.evidence).toBe(drawing.state.evidence);
	expect(patched.latestDiaryDate).toBe(drawing.latestDiaryDate);
	expect(drawing.state.marks[0].polygon).toEqual(polygon);
	expect(
		applyPolygonSave(
			{ ...drawing, state: { ...drawing.state, marks: [] } },
			response.result,
		).state.marks,
	).toEqual([]);
	expect(
		applyPolygonSave({ ...drawing, id: "other" }, response.result).id,
	).toBe("other");
});

it("rejects mismatched confirmations and survives unavailable session storage", async () => {
	const onSaved = jest.fn();
	const queue = new PolygonSaveQueue(
		jest.fn().mockResolvedValue(success("other", edit)),
		onSaved,
	);
	queue.attachStorage("invalid JSON", () => {
		throw new Error("Storage denied");
	});
	queue.enqueue("drawing", edit);
	await tick();
	expect(queue.hasPending()).toBe(true);
	expect(queue.getSnapshot().items[0].status).toBe("failed");
	expect(onSaved).not.toHaveBeenCalled();
});

it("projects and acknowledges the whole zone together and blocks overlapping piece edits", async () => {
	let finish: (response: PolygonSaveResponse) => void = () => {};
	const save = jest.fn(
		() =>
			new Promise<PolygonSaveResponse>((resolve) => {
				finish = resolve;
			}),
	);
	const onSaved = jest.fn();
	const queue = new PolygonSaveQueue(save, onSaved);
	const joined = {
		...edit,
		group: {
			expected: drawing.state.marks.map((mark) => ({
				markId: mark.id,
				polygon: mark.polygon,
			})),
			polygons: [edit.polygon],
		},
	};
	queue.enqueue("drawing", joined);
	expect(() => queue.enqueue("drawing", second)).toThrow("vēl nav saglabāts");
	const projected = projectPolygonSaves(drawing, queue.getSnapshot().items);
	expect(projected?.state.marks).toHaveLength(1);
	expect(projected?.state.marks[0]).toMatchObject({
		id: "one",
		polygon: edit.polygon,
	});
	const response = success("drawing", joined);
	if (!response.ok) throw new Error("Expected success");
	response.result.replacedMarkIds = ["one", "two"];
	response.result.replacements = projected?.state.marks;
	finish(response);
	await tick();
	expect(queue.hasPending()).toBe(false);
	expect(onSaved).toHaveBeenCalledTimes(1);
	expect(applyPolygonSave(drawing, response.result).state.marks).toEqual(
		projected?.state.marks,
	);
});
