import type { LimeniProjectSnapshot } from "./project-snapshot-store";
import {
	clearConstructionProjectBootstrapPrefetches,
	fetchConstructionProjectBootstrap,
	fetchProjectSync,
	prefetchConstructionProjectBootstrap,
} from "./project-sync-client";

const originalFetch = global.fetch;
const cached = {
	version: "v1",
	revision: "old-revision",
	partVersions: { diary: "a".repeat(64) },
	diaryRowVersions: { row: "b".repeat(64) },
} as unknown as LimeniProjectSnapshot;
beforeEach(() => {
	global.fetch = jest.fn();
	clearConstructionProjectBootstrapPrefetches();
});
afterAll(() => {
	global.fetch = originalFetch;
});

it("checks unchanged revisions without uploading row inventories or reading a response body", async () => {
	const json = jest.fn();
	const response = { status: 304, json } as unknown as Response;
	jest.mocked(global.fetch).mockResolvedValue(response);
	expect(
		await fetchProjectSync("site", cached, new AbortController().signal),
	).toBe(response);
	expect(global.fetch).toHaveBeenCalledTimes(1);
	expect(jest.mocked(global.fetch).mock.calls[0][1]).toMatchObject({
		headers: {
			"If-None-Match": '"old-revision"',
			"X-Project-Sync": "records-v1",
		},
	});
	expect(jest.mocked(global.fetch).mock.calls[0][1]?.body).toBeUndefined();
	expect(
		jest.mocked(global.fetch).mock.calls[0][1]?.headers,
	).not.toHaveProperty("X-Project-Parts");
	expect(json).not.toHaveBeenCalled();
});

it("requests row changes only after a changed revision, using the cached revision and the same abort signal", async () => {
	const delta = { status: 200 } as Response;
	jest
		.mocked(global.fetch)
		.mockResolvedValueOnce({
			status: 202,
			headers: new Map([["x-project-sync", "records-v1"]]),
		} as unknown as Response)
		.mockResolvedValueOnce(delta);
	const signal = new AbortController().signal;
	expect(await fetchProjectSync("site/escaped", cached, signal)).toBe(delta);
	expect(global.fetch).toHaveBeenNthCalledWith(
		2,
		"/api/sites/site%2Fescaped/limeni-project",
		{
			method: "POST",
			cache: "no-cache",
			signal,
			headers: {
				"Content-Type": "application/json",
				"If-None-Match": '"old-revision"',
			},
			body: JSON.stringify({
				parts: cached.partVersions,
				rows: cached.diaryRowVersions,
			}),
		},
	);
});

it("posts cached construction row versions without a negotiation request", async () => {
	const delta = { status: 200 } as Response;
	jest.mocked(global.fetch).mockResolvedValue(delta);
	const signal = new AbortController().signal;
	expect(
		await fetchProjectSync("site/escaped", cached, signal, "construction"),
	).toBe(delta);
	expect(global.fetch).toHaveBeenCalledTimes(1);
	expect(global.fetch).toHaveBeenCalledWith(
		"/api/sites/site%2Fescaped/construction-project",
		{
			method: "POST",
			cache: "no-cache",
			signal,
			headers: {
				"Content-Type": "application/json",
				"If-None-Match": '"old-revision"',
			},
			body: JSON.stringify({
				parts: cached.partVersions,
				rows: cached.diaryRowVersions,
			}),
		},
	);
});

it("supports existing snapshots and servers without record-sync negotiation", async () => {
	const response = { status: 200 } as Response;
	jest.mocked(global.fetch).mockResolvedValue(response);
	expect(
		await fetchProjectSync(
			"site",
			{ ...cached, diaryRowVersions: undefined },
			new AbortController().signal,
		),
	).toBe(response);
	expect(global.fetch).toHaveBeenCalledTimes(1);
	expect(
		jest.mocked(global.fetch).mock.calls[0][1]?.headers,
	).not.toHaveProperty("X-Project-Sync");
});

it("uses a fresh request without cached fingerprints when recovering a damaged cache", async () => {
	jest.mocked(global.fetch).mockResolvedValue({ status: 200 } as Response);
	await fetchProjectSync("site", null, new AbortController().signal);
	expect(jest.mocked(global.fetch).mock.calls[0][1]?.headers).toEqual({});
});

it("loads a cold construction bootstrap from its additive endpoint", async () => {
	const response = { status: 200 } as Response;
	jest.mocked(global.fetch).mockResolvedValue(response);
	const signal = new AbortController().signal;
	expect(await fetchConstructionProjectBootstrap("site/one", signal)).toBe(
		response,
	);
	expect(global.fetch).toHaveBeenCalledWith(
		"/api/sites/site%2Fone/construction-project/bootstrap",
		{ cache: "no-cache", signal },
	);
});

it("hands one prefetched bootstrap response to the destination project", async () => {
	const payload = { kind: "construction-bootstrap" };
	const response = {
		ok: true,
		clone: () => ({ json: async () => payload }),
	} as unknown as Response;
	jest.mocked(global.fetch).mockResolvedValue(response);

	await Promise.all([
		prefetchConstructionProjectBootstrap("site"),
		prefetchConstructionProjectBootstrap("site"),
	]);
	const consumed = await fetchConstructionProjectBootstrap(
		"site",
		new AbortController().signal,
	);

	expect(global.fetch).toHaveBeenCalledTimes(1);
	expect(await consumed.json()).toEqual({ kind: "construction-bootstrap" });
});
