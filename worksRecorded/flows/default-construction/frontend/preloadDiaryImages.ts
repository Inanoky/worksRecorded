"use client";

import { normalizeDiaryPhotoUrls } from "../lib/diary-photos";

export type DiaryImageProgress = {
	total: number;
	completed: number;
	failed: number;
};

export async function preloadDiaryImages(
	values: unknown,
	options: {
		cache: Map<string, HTMLImageElement>;
		signal: AbortSignal;
		onProgress?: (progress: DiaryImageProgress) => void;
		timeoutMs?: number;
	},
) {
	const urls = normalizeDiaryPhotoUrls(values);
	const progress: DiaryImageProgress = {
		total: urls.length,
		completed: 0,
		failed: 0,
	};
	options.onProgress?.({ ...progress });
	let next = 0;
	async function worker() {
		while (next < urls.length && !options.signal.aborted) {
			const url = urls[next++];
			const loaded =
				options.cache.has(url) ||
				(await new Promise<boolean>((resolve) => {
					const image = new window.Image();
					let settled = false;
					const finish = (success: boolean) => {
						if (settled) return;
						settled = true;
						clearTimeout(timer);
						options.signal.removeEventListener("abort", abort);
						image.onload = null;
						image.onerror = null;
						if (success && !options.signal.aborted)
							options.cache.set(url, image);
						else image.src = "";
						resolve(success);
					};
					const abort = () => finish(false);
					const timer = setTimeout(abort, options.timeoutMs ?? 20000);
					options.signal.addEventListener("abort", abort, { once: true });
					image.onload = () => {
						if (typeof image.decode === "function")
							void image.decode().then(
								() => finish(true),
								() => finish(false),
							);
						else finish(true);
					};
					image.onerror = abort;
					image.src = url;
				}));
			if (options.signal.aborted) break;
			progress.completed += 1;
			if (!loaded) progress.failed += 1;
			options.onProgress?.({ ...progress });
		}
	}
	await Promise.all(
		Array.from({ length: Math.min(8, urls.length) }, () => worker()),
	);
	return progress;
}
