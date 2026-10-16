import { BisDiarySyncCache, syncLinkedBisRecords } from "./diary-record-sync";

const records = ["1", "2", "3"].map((id) => ({
	id,
	BISId: `100${id}`,
	bisStatus: "draft",
}));
const result = { checked: 3, cleared: 0, clearedRecordIds: [] };

it.each([401, 403, 429, 500, 503])(
	"stops on HTTP %s without clearing links or requesting remaining records",
	async (status) => {
		const fetchRecord = jest.fn().mockResolvedValue({
			ok: false,
			status,
			json: async () => ({ errors: [{ detail: "not found" }] }),
		});
		const updateRecord = jest.fn();
		await expect(
			syncLinkedBisRecords({ records, fetchRecord, updateRecord }),
		).rejects.toThrow(`HTTP ${status}`);
		expect(fetchRecord).toHaveBeenCalledTimes(1);
		expect(updateRecord).not.toHaveBeenCalled();
	},
);

it("only clears confirmed missing records and updates changed approval status", async () => {
	const fetchRecord = jest
		.fn()
		.mockResolvedValueOnce({ ok: false, status: 404 })
		.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({ data: { attributes: { status: "approved" } } }),
		})
		.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({ data: { attributes: { status: "draft" } } }),
		});
	const updateRecord = jest.fn();
	await expect(
		syncLinkedBisRecords({ records, fetchRecord, updateRecord }),
	).resolves.toEqual({ checked: 3, cleared: 1, clearedRecordIds: ["1"] });
	expect(updateRecord.mock.calls).toEqual([
		[records[0], { BISId: null, bisStatus: null }],
		[records[1], { bisStatus: "approved" }],
	]);
});

it("does not clear a link or status when BIS returns malformed successful data", async () => {
	const fetchRecord = jest
		.fn()
		.mockResolvedValue({ ok: true, json: async () => ({ data: null }) });
	const updateRecord = jest.fn();
	await expect(
		syncLinkedBisRecords({ records, fetchRecord, updateRecord }),
	).rejects.toThrow("nepilnīgus");
	expect(updateRecord).not.toHaveBeenCalled();
});

it("deduplicates concurrent checks and caches successful checks by authenticated scope", async () => {
	const cache = new BisDiarySyncCache();
	let finish!: (value: typeof result) => void;
	const task = jest.fn(
		() =>
			new Promise<typeof result>((resolve) => {
				finish = resolve;
			}),
	);
	const first = cache.run("base:user:site", task);
	const second = cache.run("base:user:site", task);
	await Promise.resolve();
	expect(task).toHaveBeenCalledTimes(1);
	finish(result);
	await expect(Promise.all([first, second])).resolves.toEqual([result, result]);
	await cache.run("base:user:site", task);
	expect(task).toHaveBeenCalledTimes(1);
	const differentUser = jest.fn().mockResolvedValue(result);
	await cache.run("base:other:site", differentUser);
	expect(differentUser).toHaveBeenCalledTimes(1);
});

it("backs off failures even on forced checks, then allows retry", async () => {
	jest.useFakeTimers();
	try {
		const cache = new BisDiarySyncCache();
		const task = jest
			.fn()
			.mockRejectedValueOnce(new Error("BIS unavailable"))
			.mockResolvedValue(result);
		await expect(cache.run("scope", task)).rejects.toThrow("BIS unavailable");
		await expect(cache.run("scope", task, true)).rejects.toThrow(
			"BIS unavailable",
		);
		expect(task).toHaveBeenCalledTimes(1);
		jest.advanceTimersByTime(60_001);
		await expect(cache.run("scope", task)).resolves.toEqual(result);
		expect(task).toHaveBeenCalledTimes(2);
		await cache.run("scope", task);
		expect(task).toHaveBeenCalledTimes(2);
		await cache.run("scope", task, true);
		expect(task).toHaveBeenCalledTimes(3);
		jest.advanceTimersByTime(5 * 60_000 + 1);
		await cache.run("scope", task);
		expect(task).toHaveBeenCalledTimes(4);
	} finally {
		jest.useRealTimers();
	}
});
