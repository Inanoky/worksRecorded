import type { DiaryEditChanges } from "./diary-edit";
import type { DiaryEditRequest } from "./diary-edit-input";
import { DiarySaveQueue } from "./diary-save-queue";

const siteId = "c39cb04c-8ce5-477d-acd0-99586a82d850";
const id = "79867920-ab26-41a6-9bd8-f3ea10ffa452";
const request = (
	comment = "Edited",
	before = "Original",
): DiaryEditRequest => ({
	siteId,
	updates: [
		{ id, fields: { Comments: comment }, expected: { Comments: before } },
	],
	creates: [],
});
const ack = (Comments = "Edited"): DiaryEditChanges => ({
	rows: [{ id, Comments }] as never,
	createdIds: [],
});
function storage() {
	const map = new Map<string, string>();
	return {
		get length() {
			return map.size;
		},
		key: (i: number) => [...map.keys()][i] ?? null,
		getItem: (key: string) => map.get(key) ?? null,
		setItem: jest.fn((key: string, value: string) => {
			map.set(key, value);
		}),
		removeItem: jest.fn((key: string) => {
			map.delete(key);
		}),
	};
}
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<T>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}
const flush = async () => {
	for (let i = 0; i < 12; i++) await Promise.resolve();
};

it("coalesces successive queued edits to the same row, keeping the earliest expected values", async () => {
	const disk = storage();
	const first = deferred<DiaryEditChanges>();
	const save = jest
		.fn()
		.mockReturnValueOnce(first.promise)
		.mockResolvedValue(ack("Latest"));
	const queue = new DiarySaveQueue({ siteId, scope: "user:org", save });
	queue.attach(disk);
	queue.enqueue(request("First"));
	queue.enqueue(request("Second", "First"));
	queue.enqueue(request("Latest", "Second"));
	expect(queue.getSnapshot().items).toHaveLength(2);
	first.resolve(ack("First"));
	await flush();
	expect(save).toHaveBeenCalledTimes(2);
	expect(save.mock.calls[1][0].updates).toEqual([
		{ id, fields: { Comments: "Latest" }, expected: { Comments: "First" } },
	]);
});

it("persists before sending, projects only editable fields and never reports saved before acknowledgement", async () => {
	const disk = storage();
	const pending = deferred<DiaryEditChanges>();
	const save = jest.fn(() => {
		expect(disk.length).toBe(1);
		return pending.promise;
	});
	const queue = new DiarySaveQueue({ siteId, scope: "user:org", save });
	queue.attach(disk);
	await flush();
	queue.enqueue(request());
	expect(
		queue.project([
			{ id, Comments: "Original", Photos: ["photo"], TimeInvolved: "5" },
		]),
	).toEqual([{ id, Comments: "Edited", Photos: ["photo"], TimeInvolved: "5" }]);
	expect(queue.getSnapshot().lastSavedAt).toBeNull();
	pending.resolve(ack());
	await flush();
	expect(disk.length).toBe(0);
	expect(queue.getSnapshot().items).toEqual([]);
	expect(queue.getSnapshot().lastSavedAt).not.toBeNull();
});

it("serializes rapid edits and keeps the newest draft over an older server response or refresh", async () => {
	const disk = storage();
	const first = deferred<DiaryEditChanges>();
	const second = deferred<DiaryEditChanges>();
	const save = jest
		.fn()
		.mockReturnValueOnce(first.promise)
		.mockReturnValueOnce(second.promise);
	const queue = new DiarySaveQueue({ siteId, scope: "user:org", save });
	queue.attach(disk);
	await flush();
	queue.enqueue(request("First"));
	queue.enqueue(request("Latest", "First"));
	await flush();
	expect(save).toHaveBeenCalledTimes(1);
	first.resolve(ack("First"));
	await flush();
	expect(save).toHaveBeenCalledTimes(2);
	expect(queue.project([{ id, Comments: "Original" }])[0].Comments).toBe(
		"Latest",
	);
	expect(queue.project(ack("First").rows)[0].Comments).toBe("Latest");
	second.resolve(ack("Latest"));
	await flush();
	expect(queue.getSnapshot().confirmed.rows[0].Comments).toBe("Latest");
});

it("recovers pending creates after reload with exactly the same ID and scope", async () => {
	const disk = storage();
	const save = jest.fn(() => new Promise<DiaryEditChanges>(() => {}));
	const queue = new DiarySaveQueue({ siteId, scope: "user:org", save });
	queue.attach(disk);
	await flush();
	queue.enqueue({
		siteId,
		updates: [],
		creates: [
			{
				clientId: id,
				fields: {
					Date: new Date("2026-10-14T08:00:00Z"),
					Amounts: 0,
					Comments: "New",
				},
			},
		],
	});
	queue.detach();
	const wrongUser = new DiarySaveQueue({ siteId, scope: "other:org", save });
	wrongUser.attach(disk);
	await flush();
	expect(wrongUser.getSnapshot().items).toEqual([]);
	const restoredSave = jest.fn().mockResolvedValue(ack("New"));
	const restored = new DiarySaveQueue({
		siteId,
		scope: "user:org",
		save: restoredSave,
	});
	restored.attach(disk);
	expect(restored.project([])).toEqual([
		expect.objectContaining({ id, Comments: "New", Amounts: "0" }),
	]);
	await flush();
	expect(restoredSave.mock.calls[0][0].creates[0].clientId).toBe(id);
	expect(disk.length).toBe(0);
});

it("keeps failed batches and dependent edits, retries in order and restores failures without auto-replaying", async () => {
	const disk = storage();
	const save = jest
		.fn()
		.mockRejectedValueOnce(new Error("Offline"))
		.mockResolvedValue(ack());
	const queue = new DiarySaveQueue({ siteId, scope: "user:org", save });
	queue.attach(disk);
	await flush();
	queue.enqueue(request());
	await flush();
	expect(queue.getSnapshot().items[0].error).toBe("Offline");
	expect(disk.length).toBe(1);
	queue.detach();
	const restored = new DiarySaveQueue({ siteId, scope: "user:org", save });
	restored.attach(disk);
	await flush();
	expect(save).toHaveBeenCalledTimes(1);
	restored.enqueue(request("Latest", "Edited"));
	await flush();
	expect(save).toHaveBeenCalledTimes(1);
	restored.retry();
	await flush();
	expect(save).toHaveBeenCalledTimes(3);
	expect(disk.length).toBe(0);
});

it("refuses to enqueue when persistence fails and leaves any existing saved drafts intact", async () => {
	const disk = storage();
	const save = jest.fn();
	const queue = new DiarySaveQueue({ siteId, scope: "user:org", save });
	queue.attach(disk);
	await flush();
	disk.setItem.mockImplementation(() => {
		throw new Error("Quota exceeded");
	});
	expect(() => queue.enqueue(request())).toThrow("nepietiek vietas");
	expect(save).not.toHaveBeenCalled();
	expect(queue.getSnapshot().items).toEqual([]);
});

it("does not remove a batch after incomplete acknowledgement", async () => {
	const disk = storage();
	const queue = new DiarySaveQueue({
		siteId,
		scope: "user:org",
		save: jest.fn().mockResolvedValue({ rows: [], createdIds: [] }),
	});
	queue.attach(disk);
	await flush();
	queue.enqueue(request());
	await flush();
	expect(disk.length).toBe(1);
	expect(queue.getSnapshot().lastSavedAt).toBeNull();
	expect(queue.getSnapshot().items[0].error).toContain("neapstiprināja");
});

it("does not overwrite corrupt saved drafts or accept another site", async () => {
	const disk = storage();
	const queue = new DiarySaveQueue({
		siteId,
		scope: "user:org",
		save: jest.fn(),
	});
	disk.setItem(queue.prefix + id, "corrupt draft");
	queue.attach(disk);
	expect(queue.getSnapshot().error).not.toBeNull();
	expect(() => queue.enqueue(request())).toThrow();
	expect(disk.length).toBe(1);
	const other = new DiarySaveQueue({
		siteId,
		scope: "other:org",
		save: jest.fn(),
	});
	other.attach(disk);
	expect(() => other.enqueue({ ...request(), siteId: id })).toThrow();
});

it("rechecks storage under a cross-tab lock before replaying an already-acknowledged batch", async () => {
	const disk = storage();
	const save = jest.fn().mockResolvedValue(ack());
	let release!: () => Promise<void>;
	const queue = new DiarySaveQueue({
		siteId,
		scope: "user:org",
		save,
		lock: (run) =>
			new Promise<void>((resolve) => {
				release = async () => {
					await run();
					resolve();
				};
			}),
	});
	queue.attach(disk);
	queue.enqueue(request());
	const storedKey = disk.key(0);
	if (!storedKey) throw new Error("Missing persisted batch");
	disk.removeItem(storedKey);
	await release();
	await flush();
	expect(save).not.toHaveBeenCalled();
	expect(queue.getSnapshot().items).toEqual([]);
});
