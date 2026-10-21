import type { PlanningImage } from "./planning-image";
import type { VisualPlan } from "./planning-model";
import type { PersistentProjectCache } from "./project-persistent-cache";

export type PlanningImagePlan = Pick<
	VisualPlan,
	"work" | "location" | "geometry"
>;

export function planningImageCacheKey(
	source: string,
	plan: PlanningImagePlan,
	color: string,
	section?: string,
) {
	return JSON.stringify([
		"planning-images:v2",
		source,
		plan.work,
		plan.location,
		plan.geometry.areas,
		color,
		section ?? null,
	]);
}

export class PlanningImageCache {
	private images = new Map<string, PlanningImage[]>();
	private jobs = new Map<
		string,
		{
			slot: string;
			controller: AbortController;
			promise: Promise<PlanningImage[]>;
		}
	>();
	private queue: Promise<unknown> = Promise.resolve();

	peek(key: string) {
		return this.images.get(key);
	}

	load(
		slot: string,
		key: string,
		create: (signal: AbortSignal) => Promise<PlanningImage[]>,
		persistence?: PersistentProjectCache,
	) {
		for (const [other, job] of this.jobs)
			if (job.slot === slot && other !== key) job.controller.abort();
		const cached = this.images.get(key);
		if (cached) return Promise.resolve(cached);
		const pending = this.jobs.get(key);
		if (pending && !pending.controller.signal.aborted) return pending.promise;
		const controller = new AbortController();
		const { signal } = controller;
		const promise = this.queue
			.catch(() => {})
			.then(async () => {
				signal.throwIfAborted();
				const metadata = await persistence?.read<
					Array<{ page: number; section?: string }>
				>(`${key}:pages`);
				let images: PlanningImage[] | undefined;
				if (Array.isArray(metadata) && metadata.length) {
					const saved = await Promise.all(
						metadata.map(async (item, index) => {
							const blob = await persistence?.read<Blob>(`${key}:${index}`);
							return blob instanceof Blob && blob.type === "image/png"
								? { ...item, blob }
								: null;
						}),
					);
					if (saved.every((image) => image !== null))
						images = saved as PlanningImage[];
				}
				signal.throwIfAborted();
				if (!images) {
					images = await create(signal);
					signal.throwIfAborted();
					if (!images.length) throw new Error("Zonas attēls nav pieejams.");
					if (persistence) {
						const prepared = images;
						void Promise.all(
							prepared.map((image, index) =>
								persistence.write(`${key}:${index}`, image.blob),
							),
						)
							.then(() => {
								if (signal.aborted) return;
								return persistence.write(
									`${key}:pages`,
									prepared.map(({ page, section }) => ({ page, section })),
								);
							})
							.catch(() => {});
					}
				}
				this.images.delete(key);
				this.images.set(key, images);
				let bytes = [...this.images.values()]
					.flat()
					.reduce((sum, image) => sum + image.blob.size, 0);
				for (const [old, value] of this.images) {
					if (this.images.size <= 12 && bytes <= 32_000_000) break;
					if (old === key) continue;
					bytes -= value.reduce((sum, image) => sum + image.blob.size, 0);
					this.images.delete(old);
				}
				return images;
			})
			.catch((error) => {
				controller.abort();
				throw error;
			})
			.finally(() => {
				if (this.jobs.get(key)?.controller === controller)
					this.jobs.delete(key);
			});
		this.jobs.set(key, { slot, controller, promise });
		this.queue = promise.catch(() => {});
		return promise;
	}

	clear() {
		for (const job of this.jobs.values()) job.controller.abort();
		this.jobs.clear();
		this.images.clear();
	}
}
