import type { LimeniProjectSnapshot } from "./project-snapshot-store";

export type ConstructionProjectBootstrapPayload = {
	kind: "construction-bootstrap";
	snapshot: LimeniProjectSnapshot;
};

export function fetchConstructionProjectBootstrap(
	siteId: string,
	signal: AbortSignal,
) {
	return fetch(
		`/api/sites/${encodeURIComponent(siteId)}/construction-project/bootstrap`,
		{ cache: "no-cache", signal },
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
	if (
		mode === "construction" &&
		cached?.partVersions &&
		cached.diaryRowVersions
	)
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
