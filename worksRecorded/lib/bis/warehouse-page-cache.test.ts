import {
	createWarehousePageCache,
	warehousePageKey,
} from "./warehouse-page-cache";

it("deduplicates concurrent requests and reuses resolved pages", async () => {
	const cache = createWarehousePageCache<number[]>();
	const load = jest.fn(async () => [1, 2]);
	const key = warehousePageKey({ page: 2, search: "", pageSize: 50 });
	const first = cache.read(key, load),
		second = cache.read(key, load);
	expect(first).toBe(second);
	await expect(first).resolves.toEqual([1, 2]);
	await cache.read(key, load);
	expect(load).toHaveBeenCalledTimes(1);
});
it("separates filters and page sizes and permits reloading after invalidation", async () => {
	const cache = createWarehousePageCache<number[]>();
	const load = jest.fn(async () => [1]);
	for (const input of [
		{ page: 1, pageSize: 50 },
		{ page: 2, pageSize: 50 },
		{ page: 1, pageSize: 25 },
		{ page: 1, pageSize: 50, search: "needle" },
	])
		await cache.read(warehousePageKey(input), load);
	expect(load).toHaveBeenCalledTimes(4);
	cache.clear();
	await cache.read(warehousePageKey({ page: 1, pageSize: 50 }), load);
	expect(load).toHaveBeenCalledTimes(5);
});
it("retries failures and isolates project cache instances", async () => {
	const cache = createWarehousePageCache<number>();
	const other = createWarehousePageCache<number>();
	const load = jest
		.fn()
		.mockRejectedValueOnce(new Error("unavailable"))
		.mockResolvedValue(3);
	await expect(cache.read("page", load)).rejects.toThrow("unavailable");
	await expect(cache.read("page", load)).resolves.toBe(3);
	await other.read("page", load);
	expect(load).toHaveBeenCalledTimes(3);
});
