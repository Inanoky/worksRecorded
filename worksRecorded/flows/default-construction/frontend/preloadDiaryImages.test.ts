import { preloadDiaryImages } from "./preloadDiaryImages";

let images: HTMLImageElement[];
beforeEach(() => {
	images = [];
	jest.spyOn(window, "Image").mockImplementation(() => {
		const image = {
			src: "",
			onload: null,
			onerror: null,
			decode: jest.fn().mockResolvedValue(undefined),
		} as unknown as HTMLImageElement;
		images.push(image);
		return image;
	});
});
afterEach(() => {
	jest.restoreAllMocks();
	jest.useRealTimers();
});
const tick = async () => {
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
};
const options = () => ({
	cache: new Map<string, HTMLImageElement>(),
	signal: new AbortController().signal,
});

it("waits for every unique original image, including images beyond the first page", async () => {
	const urls = Array.from({ length: 23 }, (_, i) => `https://utfs.io/f/${i}`);
	const config = options();
	const onProgress = jest.fn();
	let done = false;
	const pending = preloadDiaryImages([...urls, urls[0], "bad-url"], {
		...config,
		onProgress,
	}).then((result) => {
		done = true;
		return result;
	});
	expect(images).toHaveLength(8);
	expect(done).toBe(false);
	for (let i = 0; i < urls.length; i++) {
		expect(images[i].src).toBe(urls[i]);
		images[i].onload?.(new Event("load"));
		await tick();
	}
	expect(await pending).toEqual({ total: 23, completed: 23, failed: 0 });
	expect(config.cache.size).toBe(23);
	expect(onProgress).toHaveBeenLastCalledWith({
		total: 23,
		completed: 23,
		failed: 0,
	});
	await preloadDiaryImages(urls, config);
	expect(images).toHaveLength(23);
});

it("waits for image decoding before reporting ready", async () => {
	let decoded!: () => void;
	let done = false;
	const pending = preloadDiaryImages(["https://utfs.io/f/1"], options()).then(
		(result) => {
			done = true;
			return result;
		},
	);
	(images[0].decode as jest.Mock).mockReturnValue(
		new Promise<void>((resolve) => {
			decoded = resolve;
		}),
	);
	images[0].onload?.(new Event("load"));
	await tick();
	expect(done).toBe(false);
	decoded();
	expect((await pending).failed).toBe(0);
});

it("finishes despite failed or timed-out images", async () => {
	jest.useFakeTimers();
	const config = options();
	const pending = preloadDiaryImages(
		["https://utfs.io/f/bad", "https://utfs.io/f/slow"],
		{ ...config, timeoutMs: 100 },
	);
	images[0].onerror?.(new Event("error"));
	jest.advanceTimersByTime(100);
	expect(await pending).toEqual({ total: 2, completed: 2, failed: 2 });
	expect(config.cache.size).toBe(0);
	expect(images.every((image) => image.src === "")).toBe(true);
});

it("cancels in-flight downloads and does not start more after leaving the project", async () => {
	const controller = new AbortController();
	const config = { ...options(), signal: controller.signal };
	const pending = preloadDiaryImages(
		Array.from({ length: 20 }, (_, i) => `https://utfs.io/f/${i}`),
		config,
	);
	controller.abort();
	await pending;
	expect(images).toHaveLength(8);
	expect(images.every((image) => image.src === "")).toBe(true);
	expect(config.cache.size).toBe(0);
});

it("opens projects with no photos without waiting", async () => {
	expect(await preloadDiaryImages([], options())).toEqual({
		total: 0,
		completed: 0,
		failed: 0,
	});
	expect(images).toHaveLength(0);
});
