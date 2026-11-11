import type { LimeniProjectSnapshot } from "./project-snapshot-store";

export type ConstructionProjectBootstrapPayload = {
	kind: "construction-bootstrap";
	snapshot: LimeniProjectSnapshot;
};

const BOOTSTRAP_PREFETCH_TTL_MS = 15_000;
const bootstrapPrefetches = new Map<
	string,
	{ expiresAt: number; response: Promise<Response> }
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

export function prefetchConstructionProjectBootstrap(siteId: string) {
	const existing = getBootstrapPrefetch(siteId);
	if (existing)
		return existing.response.then(
			() => undefined,
			() => undefined,
		);

	const entry = {
		expiresAt: Date.now() + BOOTSTRAP_PREFETCH_TTL_MS,
		response: fetch(constructionBootstrapUrl(siteId), { cache: "no-cache" }),
	};
	bootstrapPrefetches.set(siteId, entry);
	void entry.response.then(
		(response) => {
			if (!response.ok && bootstrapPrefetches.get(siteId) === entry)
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
	return response.clone();
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
	if (cached?.partVersions && cached.diaryRowVersions)
		headers["X-Project-Sync"] = "records-v1";
	else if (cached?.partVersions)
		headers["X-Project-Parts"] = JSON.stringify(cached.partVersions);
	const response = await fetch(url, { cache: "no-cache", signal, headers });
	if (
		response.status !== 202 ||
		response.headers.get("x-project-sync") !== "records-v1" ||
		!cached?.diaryRowVersions ||
		!cached.partVersions
	)
		return response;
	return fetch(url, {
		method: "POST",
		cache: "no-cache",
		signal,
		headers: {
			"Content-Type": "application/json",
			"If-None-Match": headers["If-None-Match"],
		},
		body: JSON.stringify({
			parts: cached.partVersions,
			rows: cached.diaryRowVersions,
			sources: cached.sourceVersions,
		}),
	});
}
