import { PersistentProjectCache } from "./project-persistent-cache";
import type { LimeniProjectSnapshot } from "./project-snapshot-store";

export type ConstructionProjectBootstrapPayload = {
	kind: "construction-bootstrap";
	snapshot: LimeniProjectSnapshot;
};

const BOOTSTRAP_PREFETCH_TTL_MS = 15_000;
export const LIMENI_DIARY_BOOTSTRAP_KEY = "diary-bootstrap";
const bootstrapPrefetches = new Map<
	string,
	{ expiresAt: number; response: Promise<Response | null> }
>();

function constructionBootstrapUrl(siteId: string) {
	return `/api/sites/${encodeURIComponent(siteId)}/construction-project/bootstrap`;
}

function getBootstrapPrefetch(siteId: string) {
	const entry = bootstrapPrefetches.get(siteId);
	if (!entry) return null;
	if (entry.expiresAt > Date.now()) return entry;
	bootstrapPrefetches.delete(siteId);
	return null;
}

export function prefetchConstructionProjectBootstrap(
	siteId: string,
	limeniCacheScope?: string,
) {
	const existing = getBootstrapPrefetch(siteId);
	if (existing)
		return existing.response.then(
			() => undefined,
			() => undefined,
		);

	const load = async () => {
		if (limeniCacheScope) {
			const cache = new PersistentProjectCache(limeniCacheScope, siteId);
			const saved = await cache.read<LimeniProjectSnapshot>("snapshot");
			if (saved?.settings?.siteId === siteId) return null;
			const diary = await cache.read<LimeniProjectSnapshot>(
				LIMENI_DIARY_BOOTSTRAP_KEY,
			);
			if (diary?.settings?.siteId === siteId) return null;
		}
		return fetch(constructionBootstrapUrl(siteId), { cache: "no-cache" });
	};
	const entry = {
		expiresAt: Date.now() + BOOTSTRAP_PREFETCH_TTL_MS,
		response: load(),
	};
	bootstrapPrefetches.set(siteId, entry);
	void entry.response.then(
		(response) => {
			if (response && !response.ok && bootstrapPrefetches.get(siteId) === entry)
				bootstrapPrefetches.delete(siteId);
		},
		() => {
			if (bootstrapPrefetches.get(siteId) === entry)
				bootstrapPrefetches.delete(siteId);
		},
	);
	return entry.response.then(
		() => undefined,
		() => undefined,
	);
}

export function clearConstructionProjectBootstrapPrefetches() {
	bootstrapPrefetches.clear();
}

export async function fetchConstructionProjectBootstrap(
	siteId: string,
	signal: AbortSignal,
) {
	const prefetched = getBootstrapPrefetch(siteId);
	if (!prefetched)
		return fetch(constructionBootstrapUrl(siteId), {
			cache: "no-cache",
			signal,
		});

	bootstrapPrefetches.delete(siteId);
	const response = await prefetched.response;
	if (signal.aborted)
		throw signal.reason ?? new DOMException("Aborted", "AbortError");
	return (
		response?.clone() ??
		fetch(constructionBootstrapUrl(siteId), {
			cache: "no-cache",
			signal,
		})
	);
}

export async function fetchProjectSync(
	siteId: string,
	cached: LimeniProjectSnapshot | null,
	signal: AbortSignal,
	mode: "limeni" | "construction" = "limeni",
) {
	const url = `/api/sites/${encodeURIComponent(siteId)}/${mode}-project`;
	const headers: Record<string, string> = cached
		? { "If-None-Match": `"${cached.revision ?? cached.version}"` }
		: {};
	const inventory =
		cached?.partVersions && cached.diaryRowVersions
			? JSON.stringify({
					parts: cached.partVersions,
					rows: cached.diaryRowVersions,
					sources: cached.sourceVersions,
				})
			: null;
	const sendInventory = (body: string, cache: RequestCache) =>
		fetch(url, {
			method: "POST",
			cache,
			signal,
			headers: { ...headers, "Content-Type": "application/json" },
			body,
		});
	if (mode === "limeni" && inventory && cached?.sourceVersions)
		return fetch(url, {
			method: "POST",
			cache: "no-store",
			signal,
			headers: {
				"Content-Type": "application/json",
				"X-Project-Revision": cached.revision ?? cached.version,
			},
			body: inventory,
		});
	if (inventory) {
		const response = await fetch(url, {
			cache: "no-cache",
			signal,
			headers: { ...headers, "X-Project-Sync": "records-v1" },
		});
		return response.status === 202 &&
			response.headers.get("x-project-sync") === "records-v1"
			? sendInventory(inventory, "no-cache")
			: response;
	}
	if (cached?.partVersions)
		headers["X-Project-Parts"] = JSON.stringify(cached.partVersions);
	return fetch(url, { cache: "no-cache", signal, headers });
}
