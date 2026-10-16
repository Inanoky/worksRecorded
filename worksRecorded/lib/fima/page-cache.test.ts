import { createFimaPageCache, fetchFimaPage } from "./page-cache";

it("deduplicates prefetch and navigation and caches resolved pages", async () => {
	const cache = createFimaPageCache<number>();
	let resolve!: (value: number) => void;
	const fetcher = jest.fn(
		() =>
			new Promise<number>((done) => {
				resolve = done;
			}),
	);
	const first = cache.load("page:2", fetcher);
	const second = cache.load("page:2", fetcher);
	expect(first).toBe(second);
	await Promise.resolve();
	resolve(2);
	await expect(first).resolves.toBe(2);
	await expect(cache.load("page:2", fetcher)).resolves.toBe(2);
	expect(fetcher).toHaveBeenCalledTimes(1);
});

it("expires pages and evicts least recently visited pages", () => {
	jest.useFakeTimers();
	const cache = createFimaPageCache<number>(2, 100);
	cache.seed("1", 1);
	cache.seed("2", 2);
	expect(cache.read("1")).toBe(1);
	cache.seed("3", 3);
	expect(cache.read("2")).toBeUndefined();
	jest.advanceTimersByTime(101);
	expect(cache.read("1")).toBeUndefined();
	jest.useRealTimers();
});

it("aborts pending reads and prevents a pre-edit response from entering the cache", async () => {
	const cache = createFimaPageCache<number>();
	let resolve!: (value: number) => void;
	let signal!: AbortSignal;
	const old = cache.load("1", (incoming) => {
		signal = incoming;
		return new Promise<number>((done) => {
			resolve = done;
		});
	});
	const rejected = expect(old).rejects.toMatchObject({ name: "AbortError" });
	await Promise.resolve();
	cache.clear();
	expect(signal.aborted).toBe(true);
	cache.seed("1", 10);
	resolve(1);
	await rejected;
	expect(cache.read("1")).toBe(10);
});

it("retries failed requests and does not mix cache instances or filter keys", async () => {
	const first = createFimaPageCache<number>();
	const second = createFimaPageCache<number>();
	await expect(
		first.load("project:a,page:1", async () => {
			throw new Error("offline");
		}),
	).rejects.toThrow("offline");
	await expect(first.load("project:a,page:1", async () => 1)).resolves.toBe(1);
	expect(second.read("project:a,page:1")).toBeUndefined();
	expect(first.read("project:b,page:1")).toBeUndefined();
});

it("uses an authenticated non-cacheable GET and gives a readable expiry error", async () => {
	const original = global.fetch;
	global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
	try {
		const signal = new AbortController().signal;
		await expect(
			fetchFimaPage(new URLSearchParams("page=2"), signal),
		).rejects.toThrow("Sesija");
		expect(global.fetch).toHaveBeenCalledWith("/api/fima/diary-page?page=2", {
			signal,
			cache: "no-store",
			credentials: "same-origin",
		});
	} finally {
		global.fetch = original;
	}
});
