export function createFimaPageCache<T>(limit = 10, ttl = 60_000) {
	const pages = new Map<string, { value: T; expires: number }>();
	const pending = new Map<
		string,
		{ promise: Promise<T>; controller: AbortController }
	>();
	let generation = 0;
	const read = (key: string): T | undefined => {
		const entry = pages.get(key);
		if (!entry) return undefined;
		pages.delete(key);
		if (entry.expires <= Date.now()) return undefined;
		pages.set(key, entry);
		return entry.value;
	};
	const seed = (key: string, value: T) => {
		pages.delete(key);
		pages.set(key, { value, expires: Date.now() + ttl });
		while (pages.size > limit) {
			const oldest = pages.keys().next().value;
			if (oldest === undefined) break;
			pages.delete(oldest);
		}
	};
	return {
		read,
		seed,
		clear() {
			generation++;
			pages.clear();
			for (const entry of pending.values()) entry.controller.abort();
			pending.clear();
		},
		load(
			key: string,
			fetcher: (signal: AbortSignal) => Promise<T>,
		): Promise<T> {
			const cached = read(key);
			if (cached !== undefined) return Promise.resolve(cached);
			const existing = pending.get(key);
			if (existing) return existing.promise;
			const revision = generation;
			const controller = new AbortController();
			const promise = Promise.resolve()
				.then(() => fetcher(controller.signal))
				.then((value) => {
					if (revision !== generation)
						throw new DOMException("Invalidated", "AbortError");
					seed(key, value);
					return value;
				})
				.finally(() => {
					if (pending.get(key)?.promise === promise) pending.delete(key);
				});
			pending.set(key, { promise, controller });
			return promise;
		},
	};
}

export async function fetchFimaPage<T>(
	params: URLSearchParams,
	signal: AbortSignal,
): Promise<T> {
	const response = await fetch(`/api/fima/diary-page?${params}`, {
		signal,
		cache: "no-store",
		credentials: "same-origin",
	});
	if (!response.ok) {
		throw new Error(
			response.status === 401 || response.status === 403
				? "Sesija ir beigusies vai piekļuve mainīta. Atveriet lapu no jauna."
				: "Neizdevās ielādēt ierakstus. Mēģiniet vēlreiz.",
		);
	}
	return response.json();
}
