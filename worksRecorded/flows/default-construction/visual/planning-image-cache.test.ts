import { waitFor } from "@testing-library/react";
import {
	PlanningImageCache,
	type PlanningImagePlan,
	planningImageCacheKey,
} from "./planning-image-cache";
import type { PersistentProjectCache } from "./project-persistent-cache";

const plan: PlanningImagePlan = {
	work: "XPS",
	location: "1. stāvs",
	geometry: {
		version: 1,
		areas: [
			{
				id: "area",
				page: 1,
				polygon: [
					{ x: 0.1, y: 0.1 },
					{ x: 0.4, y: 0.1 },
					{ x: 0.4, y: 0.4 },
				],
			},
		],
	},
};
const images = [
	{ page: 1, blob: new Blob(["zone"], { type: "image/png" }) },
	{
		page: 11,
		section: "PA1.6",
		blob: new Blob(["section"], { type: "image/png" }),
	},
];

it("reuses prepared images and the same in-flight work when the send dialog opens or reopens", async () => {
	const cache = new PlanningImageCache();
	const create = jest.fn(async () => images);
	const pending = cache.load("drawing", "zone", create);
	expect(cache.load("drawing", "zone", create)).toBe(pending);
	expect(await pending).toBe(images);
	expect(cache.peek("zone")).toBe(images);
	expect(await cache.load("drawing", "zone", create)).toBe(images);
	expect(create).toHaveBeenCalledTimes(1);
});

it("changes the image key for polygon, drawing, work, color, and section changes", () => {
	const key = planningImageCacheKey("source", plan, "red", "PA1.6");
	for (const changed of [
		planningImageCacheKey("new drawing", plan, "red", "PA1.6"),
		planningImageCacheKey(
			"source",
			{ ...plan, work: "Betons" },
			"red",
			"PA1.6",
		),
		planningImageCacheKey(
			"source",
			{ ...plan, location: "2. stāvs" },
			"red",
			"PA1.6",
		),
		planningImageCacheKey(
			"source",
			{ ...plan, geometry: { version: 1, areas: [] } },
			"red",
			"PA1.6",
		),
		planningImageCacheKey("source", plan, "blue", "PA1.6"),
		planningImageCacheKey("source", plan, "red", "PA1.7"),
	])
		expect(changed).not.toBe(key);
});

it("restores the zone and section from persistent blobs without rerendering the PDF", async () => {
	const entries = new Map<string, unknown>();
	const persistence = {
		read: jest.fn(async (key: string) => entries.get(key)),
		write: jest.fn(async (key: string, value: unknown) => {
			entries.set(key, value);
		}),
	} as unknown as PersistentProjectCache;
	await new PlanningImageCache().load(
		"drawing",
		"zone",
		async () => images,
		persistence,
	);
	await waitFor(() => expect(entries.has("zone:pages")).toBe(true));
	expect(entries.get("zone:0")).toBeInstanceOf(Blob);
	expect(entries.get("zone:1")).toBeInstanceOf(Blob);
	const create = jest.fn(async () => images);
	expect(
		await new PlanningImageCache().load("drawing", "zone", create, persistence),
	).toEqual(images);
	expect(create).not.toHaveBeenCalled();
	entries.delete("zone:1");
	await new PlanningImageCache().load("drawing", "zone", create, persistence);
	expect(create).toHaveBeenCalledTimes(1);
});

it("regenerates wider zone images instead of restoring the old tightly cropped images", async () => {
	const key = planningImageCacheKey("source", plan, "red", "PA1.6");
	const oldKey = JSON.stringify([
		"planning-images:v1",
		"source",
		plan.work,
		plan.location,
		plan.geometry.areas,
		"red",
		"PA1.6",
	]);
	const entries = new Map<string, unknown>([
		[`${oldKey}:pages`, [{ page: 1 }]],
		[`${oldKey}:0`, new Blob(["old crop"], { type: "image/png" })],
	]);
	const persistence = {
		read: jest.fn(async (key: string) => entries.get(key)),
		write: jest.fn(async (key: string, value: unknown) => {
			entries.set(key, value);
		}),
	} as unknown as PersistentProjectCache;
	const create = jest.fn(async () => images);
	expect(
		await new PlanningImageCache().load("drawing", key, create, persistence),
	).toEqual(images);
	expect(create).toHaveBeenCalledTimes(1);
	await waitFor(() => expect(entries.has(`${key}:pages`)).toBe(true));
});

it("cancels obsolete polygon work and never caches its stale result", async () => {
	const cache = new PlanningImageCache();
	let finish!: (value: typeof images) => void;
	let signal!: AbortSignal;
	const create = jest.fn((input: AbortSignal) => {
		signal = input;
		return new Promise<typeof images>((resolve) => {
			finish = resolve;
		});
	});
	const old = cache.load("drawing", "old polygon", create);
	const rejection = expect(old).rejects.toMatchObject({ name: "AbortError" });
	await waitFor(() => expect(create).toHaveBeenCalled());
	const latest = cache.load("drawing", "new polygon", async () => images);
	expect(signal.aborted).toBe(true);
	finish(images);
	await rejection;
	expect(await latest).toEqual(images);
	expect(cache.peek("old polygon")).toBeUndefined();
	cache.clear();
	expect(cache.peek("new polygon")).toBeUndefined();
});

it("retries failed image preparation instead of keeping a rejected promise", async () => {
	const cache = new PlanningImageCache();
	const create = jest
		.fn()
		.mockRejectedValueOnce(new Error("PDF unavailable"))
		.mockResolvedValue(images);
	await expect(cache.load("drawing", "zone", create)).rejects.toThrow(
		"PDF unavailable",
	);
	expect(await cache.load("drawing", "zone", create)).toEqual(images);
	expect(create).toHaveBeenCalledTimes(2);
});
