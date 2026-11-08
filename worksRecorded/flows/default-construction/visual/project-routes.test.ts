import { createHash } from "node:crypto";
import {
	GET as project,
	POST as syncProject,
} from "@/app/api/sites/[siteId]/limeni-project/route";
import { GET as preview } from "@/app/api/sites/[siteId]/visual/[drawingId]/preview/[page]/route";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { getLimeniDiarySnapshot } from "@/server/actions/site-diary-actions";
import { previewSource } from "./preview-revision";
import { loadProjectManifest } from "./project-revision-store";
import type { LimeniProjectSnapshot } from "./project-snapshot-store";
import {
	loadLimeniProjectSnapshot,
	ProjectAccessError,
} from "./project-snapshot-store";
import { mergeProjectDelta, type ProjectDelta } from "./project-sync";
import { fetchProjectSync } from "./project-sync-client";
import { projectSyncPayload } from "./project-sync-server";
import { requireVisualAccess } from "./store";

jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("@/lib/utils/db", () => ({
	prisma: { documents: { findFirst: jest.fn() }, $queryRaw: jest.fn() },
}));
jest.mock("./project-revision-store", () => ({
	loadProjectManifest: jest.fn(),
}));
jest.mock("@/server/actions/site-diary-actions", () => ({
	getConfig: jest.fn(),
	getLimeniDiarySnapshot: jest.fn(),
}));
jest.mock("@/server/actions/shared-actions", () => ({
	getOrganizationLanguageByUserId: jest.fn(),
}));
jest.mock("@/lib/bis/dashboard-status", () => ({
	getDashboardBisStatus: jest.fn(),
}));
jest.mock("../backend/forma2-analytics-actions", () => ({
	getDefaultConstructionForma2Results: jest.fn(),
}));
jest.mock("./store", () => ({ requireVisualAccess: jest.fn() }));
jest.mock("./project-snapshot-store", () => ({
	loadLimeniProjectSnapshot: jest.fn(),
	ProjectAccessError: class extends Error {},
}));
const web = jest.requireActual(
	"next/dist/compiled/@edge-runtime/primitives/fetch",
);
const original = {
	Request: global.Request,
	Response: global.Response,
	fetch: global.fetch,
};
beforeAll(() =>
	Object.assign(global, { Request: web.Request, Response: web.Response }),
);
afterAll(() => Object.assign(global, original));
const source = previewSource("https://a.ufs.sh/source.pdf");
const context = {
	params: Promise.resolve({ siteId: "site", drawingId: "drawing", page: "1" }),
};
beforeEach(() => {
	jest.resetAllMocks();
	jest.mocked(loadProjectManifest).mockResolvedValue({
		revision: "revision",
		sourceVersions: {},
		diaryRowVersions: {},
		organizationId: "limeni",
	});
	jest.mocked(requireUser).mockResolvedValue({ id: "user" } as never);
	jest
		.mocked(requireVisualAccess)
		.mockResolvedValue({ organizationId: "limeni" } as never);
	jest
		.mocked(loadLimeniProjectSnapshot)
		.mockResolvedValue({ version: "version" } as never);
	global.fetch = jest
		.fn()
		.mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));
});

it("negotiates record syncing with a cheap revision check before loading the snapshot", async () => {
	const response = await project(
		new Request("https://test/api/sites/site/limeni-project", {
			headers: {
				"If-None-Match": '"old"',
				"X-Project-Parts": JSON.stringify({ diary: "a".repeat(64) }),
				"X-Project-Sync": "records-v1",
			},
		}),
		context,
	);
	expect(response.status).toBe(202);
	expect(response.headers.get("x-project-sync")).toBe("records-v1");
	expect(loadProjectManifest).toHaveBeenCalledTimes(1);
	expect(loadLimeniProjectSnapshot).not.toHaveBeenCalled();
});

it("applies record inventories from a request body and sends only the changed journal row", async () => {
	const initial = {
		version: "v1",
		settings: { siteId: "site" },
		index: {},
		drawings: [],
		config: {},
		forma2: {},
		diary: {
			rows: [
				{ id: "keep", Amounts: 10 },
				{ id: "edit", Amounts: 20 },
			],
			mediaPhotos: [],
		},
	};
	const cached = projectSyncPayload(initial as never, "old");
	jest.mocked(loadLimeniProjectSnapshot).mockResolvedValue({
		...initial,
		version: "v2",
		diary: {
			...initial.diary,
			rows: [initial.diary.rows[0], { id: "edit", Amounts: 25 }],
		},
	} as never);
	const response = await syncProject(
		new Request("https://test/api/sites/site/limeni-project", {
			method: "POST",
			headers: { "Content-Type": "application/json", "If-None-Match": '"old"' },
			body: JSON.stringify({
				parts: cached.partVersions,
				rows: cached.diaryRowVersions,
			}),
		}),
		context,
	);
	expect(response.status).toBe(200);
	expect(await response.json()).toMatchObject({
		kind: "delta",
		drawings: [],
		changes: {},
		diaryRows: {
			changed: [{ id: "edit", Amounts: 25 }],
			order: ["keep", "edit"],
		},
	});
	expect(loadProjectManifest).toHaveBeenCalledWith(
		"user",
		"site",
		expect.objectContaining({ measure: expect.any(Function) }),
	);
});

it("validates record sync bodies before loading project data", async () => {
	for (const body of [
		"invalid",
		"null",
		JSON.stringify({ parts: {}, rows: { row: "invalid" } }),
	]) {
		const response = await syncProject(
			new Request("https://test", { method: "POST", body }),
			context,
		);
		expect(response.status).toBe(400);
	}
	expect(
		(
			await syncProject(
				new Request("https://test", {
					method: "POST",
					headers: { "Content-Length": "2000001" },
					body: "{}",
				}),
				context,
			)
		).status,
	).toBe(413);
	expect(loadLimeniProjectSnapshot).not.toHaveBeenCalled();
});

it("runs the client-to-route sync contract from first load through a row delta to an unchanged revision", async () => {
	const initial = {
		version: "v1",
		settings: { siteId: "site" },
		index: {},
		drawings: [],
		config: {},
		forma2: {},
		diary: {
			rows: [{ id: "row", Amounts: 10, Comments: "Original WhatsApp message" }],
			mediaPhotos: [],
		},
	} as unknown as LimeniProjectSnapshot;
	jest.mocked(loadLimeniProjectSnapshot).mockResolvedValue(initial);
	const requests: Request[] = [];
	global.fetch = jest.fn(async (url, options) => {
		const request = new Request(new URL(String(url), "https://test"), options);
		requests.push(request);
		return options?.method === "POST"
			? syncProject(request, context)
			: project(request, context);
	});
	const signal = new AbortController().signal;
	const first = (await (
		await fetchProjectSync("site", null, signal)
	).json()) as LimeniProjectSnapshot;
	expect(first.diary.rows[0].Amounts).toBe(10);
	first.sourceVersions = undefined;
	jest.mocked(loadProjectManifest).mockResolvedValue({
		revision: "r2",
		sourceVersions: {},
		diaryRowVersions: { row: "a".repeat(64) },
		organizationId: "limeni",
	});
	jest.mocked(loadLimeniProjectSnapshot).mockResolvedValue({
		...initial,
		version: "v2",
		diary: {
			...initial.diary,
			rows: [{ ...initial.diary.rows[0], Amounts: 20 }],
		},
	});
	const deltaResponse = await fetchProjectSync("site", first, signal);
	const delta = (await deltaResponse.json()) as ProjectDelta;
	expect(delta.diaryRows?.changed).toHaveLength(1);
	expect(delta.changes.diary).toBeUndefined();
	const updated = mergeProjectDelta(first, delta);
	expect(updated.diary.rows[0]).toMatchObject({
		Amounts: 20,
		Comments: "Original WhatsApp message",
	});
	expect(updated.config).toBe(first.config);
	expect((await fetchProjectSync("site", updated, signal)).status).toBe(304);
	expect(requests.map((request) => request.method)).toEqual([
		"GET",
		"GET",
		"POST",
		"GET",
	]);
	expect(loadLimeniProjectSnapshot).toHaveBeenCalledTimes(2);
});
it("negotiates a media-only delta without loading the full project or unchanged journal rows", async () => {
	const initial = {
		version: "v1",
		settings: { siteId: "site" },
		index: { drawings: [] },
		drawings: [],
		config: {},
		forma2: {},
		diary: { rows: [{ id: "keep", Works: "Unchanged" }], mediaPhotos: [] },
	} as unknown as LimeniProjectSnapshot;
	const old = "a".repeat(64),
		next = "b".repeat(64);
	jest.mocked(loadProjectManifest).mockResolvedValue({
		organizationId: "limeni",
		revision: "r1",
		sourceVersions: { media: old },
		diaryRowVersions: { keep: old },
	});
	jest.mocked(loadLimeniProjectSnapshot).mockResolvedValue(initial);
	global.fetch = jest.fn(async (url, options) => {
		const request = new Request(new URL(String(url), "https://test"), options);
		return options?.method === "POST"
			? syncProject(request, context)
			: project(request, context);
	});
	const signal = new AbortController().signal;
	const cached = (await (
		await fetchProjectSync("site", null, signal)
	).json()) as LimeniProjectSnapshot;
	jest.mocked(loadProjectManifest).mockResolvedValue({
		organizationId: "limeni",
		revision: "r2",
		sourceVersions: { media: next },
		diaryRowVersions: { keep: old },
	});
	jest.mocked(getLimeniDiarySnapshot).mockResolvedValue({
		rows: [],
		mediaPhotos: [{ URL: "new.jpg" }],
	} as never);
	const delta = (await (
		await fetchProjectSync("site", cached, signal)
	).json()) as ProjectDelta;
	const merged = mergeProjectDelta(cached, delta);
	expect(merged.diary.rows[0]).toBe(cached.diary.rows[0]);
	expect(merged.diary.mediaPhotos).toEqual([{ URL: "new.jpg" }]);
	expect(getLimeniDiarySnapshot).toHaveBeenCalledWith("site", {
		ids: [],
		media: true,
	});
	expect(loadLimeniProjectSnapshot).toHaveBeenCalledTimes(1);
	expect(delta.changes).toEqual({});
});

it("revalidates a project snapshot only after authentication and an authorized load", async () => {
	const request = new Request("https://test/api/sites/site/limeni-project", {
		headers: { "If-None-Match": '"revision"' },
	});
	const response = await project(request, context);
	expect(response.status).toBe(304);
	expect(loadProjectManifest).toHaveBeenCalledWith(
		"user",
		"site",
		expect.objectContaining({ measure: expect.any(Function) }),
	);
	expect(loadLimeniProjectSnapshot).not.toHaveBeenCalled();
	expect(response.headers.get("cache-control")).toBe("private, no-cache");
	jest
		.mocked(loadProjectManifest)
		.mockRejectedValue(new ProjectAccessError("Denied"));
	expect((await project(request, context)).status).toBe(403);
	jest
		.mocked(loadProjectManifest)
		.mockRejectedValue(new Error("Database unavailable"));
	expect((await project(request, context)).status).toBe(503);
});

it("does not read or revalidate a project for an unauthenticated visitor", async () => {
	jest.mocked(requireUser).mockRejectedValue(new Error("Sign in"));
	expect((await project(new Request("https://test"), context)).status).toBe(
		401,
	);
	expect(loadLimeniProjectSnapshot).not.toHaveBeenCalled();
});

it("refreshes cached Forma 2 calculations after a code change without resending drawings", async () => {
	const cached = {
		version: "old-calculation",
		settings: { siteId: "site" },
		index: { drawings: [] },
		drawings: [],
		diary: { rows: [] },
		config: {},
		forma2: {
			data: { resultRows: [{ id: "thermowhite", actualQuantity: null }] },
		},
	};
	const parts = projectSyncPayload(
		cached as never,
		"project-v2-same-data",
	).partVersions;
	jest
		.mocked(prisma.$queryRaw)
		.mockResolvedValue([{ sources: { site: "same-data" }, rows: [] }]);
	jest
		.mocked(loadProjectManifest)
		.mockImplementation(
			jest.requireActual<typeof import("./project-revision-store")>(
				"./project-revision-store",
			).loadProjectManifest,
		);
	jest.mocked(loadLimeniProjectSnapshot).mockResolvedValue({
		...cached,
		version: "corrected-calculation",
		forma2: {
			data: { resultRows: [{ id: "thermowhite", actualQuantity: 420 }] },
		},
	} as never);
	const response = await project(
		new Request("https://test/api/sites/site/limeni-project", {
			headers: {
				"If-None-Match": '"project-v2-same-data"',
				"X-Project-Parts": JSON.stringify(parts),
			},
		}),
		context,
	);
	expect(response.status).toBe(200);
	expect(await response.json()).toMatchObject({
		kind: "delta",
		changes: {
			forma2: {
				data: { resultRows: [{ id: "thermowhite", actualQuantity: 420 }] },
			},
		},
		drawings: [],
	});
	const unchanged = await project(
		new Request("https://test/api/sites/site/limeni-project", {
			headers: { "If-None-Match": response.headers.get("etag") ?? "" },
		}),
		context,
	);
	expect(unchanged.status).toBe(304);
	expect(loadLimeniProjectSnapshot).toHaveBeenCalledTimes(1);
});

it("serves a source-matched preview scoped to the authorized project and organization", async () => {
	jest
		.mocked(prisma.documents.findFirst)
		.mockResolvedValueOnce({ url: "https://a.ufs.sh/source.pdf" } as never)
		.mockResolvedValueOnce({
			description: JSON.stringify({
				version: 1,
				source,
				pages: [
					{
						page: 1,
						width: 3370,
						height: 2384,
						scales: [100],
						url: "https://a.ufs.sh/preview.webp",
					},
				],
			}),
		} as never);
	const response = await preview(
		new Request(`https://test/preview?v=${source}`),
		context,
	);
	expect(response.status).toBe(200);
	expect(response.headers.get("content-type")).toBe("image/webp");
	expect(response.headers.get("cache-control")).toBe("private, no-store");
	for (const [input] of jest.mocked(prisma.documents.findFirst).mock.calls)
		expect(input?.where).toMatchObject({
			siteId: "site",
			organizationId: "limeni",
		});
	expect(global.fetch).toHaveBeenCalledWith(
		expect.any(URL),
		expect.objectContaining({ redirect: "error" }),
	);
});

it("rejects obsolete preview versions before accessing stored images", async () => {
	jest
		.mocked(prisma.documents.findFirst)
		.mockResolvedValue({ url: "https://a.ufs.sh/replaced.pdf" } as never);
	expect(
		(await preview(new Request(`https://test/preview?v=${source}`), context))
			.status,
	).toBe(404);
	expect(global.fetch).not.toHaveBeenCalled();
	expect(prisma.documents.findFirst).toHaveBeenCalledTimes(1);
});

it("invalidates the old low-resolution recipe for an unchanged source PDF", async () => {
	const oldSource = createHash("sha256")
		.update("full-page-v1:https://a.ufs.sh/source.pdf")
		.digest("hex");
	expect(source).not.toBe(oldSource);
	jest
		.mocked(prisma.documents.findFirst)
		.mockResolvedValue({ url: "https://a.ufs.sh/source.pdf" } as never);
	expect(
		(await preview(new Request(`https://test/preview?v=${oldSource}`), context))
			.status,
	).toBe(404);
	expect(global.fetch).not.toHaveBeenCalled();
});

it("serves lossless high-resolution tiles with three-digit ordinals", async () => {
	const urls = Array.from(
		{ length: 192 },
		(_, i) => `https://a.ufs.sh/tile${i}.png`,
	);
	jest
		.mocked(prisma.documents.findFirst)
		.mockResolvedValueOnce({ url: "https://a.ufs.sh/source.pdf" } as never)
		.mockResolvedValueOnce({
			description: JSON.stringify({
				version: 1,
				source,
				pages: [
					{
						page: 1,
						width: 3370.39,
						height: 2383.94,
						scales: [100],
						url: "https://a.ufs.sh/overview.webp",
						tiles: {
							version: 1,
							format: "png",
							size: 1024,
							levels: [{ width: 16384, height: 11589, urls }],
						},
					},
				],
			}),
		} as never);
	const response = await preview(
		new Request(`https://test/preview?v=${source}&level=0&tile=191`),
		context,
	);
	expect(response.status).toBe(200);
	expect(response.headers.get("content-type")).toBe("image/png");
	expect(String(jest.mocked(global.fetch).mock.calls[0][0])).toBe(urls[191]);
});

it("serves only an existing authorized tile and rejects invalid tile coordinates", async () => {
	const description = JSON.stringify({
		version: 1,
		source,
		pages: [
			{
				page: 1,
				width: 2000,
				height: 1000,
				scales: [100],
				url: "https://a.ufs.sh/overview.webp",
				tiles: {
					version: 1,
					size: 1024,
					levels: [
						{
							width: 2048,
							height: 1024,
							urls: [
								"https://a.ufs.sh/tile0.webp",
								"https://a.ufs.sh/tile1.webp",
							],
						},
					],
				},
			},
		],
	});
	const run = async (suffix: string) => {
		jest
			.mocked(prisma.documents.findFirst)
			.mockReset()
			.mockResolvedValueOnce({ url: "https://a.ufs.sh/source.pdf" } as never)
			.mockResolvedValueOnce({ description } as never);
		return preview(
			new Request(`https://test/preview?v=${source}${suffix}`),
			context,
		);
	};
	expect((await run("&level=0&tile=1")).status).toBe(200);
	expect(String(jest.mocked(global.fetch).mock.calls[0][0])).toBe(
		"https://a.ufs.sh/tile1.webp",
	);
	jest.mocked(global.fetch).mockClear();
	for (const suffix of [
		"&level=-1&tile=0",
		"&level=0&tile=99",
		"&level=0",
		"&tile=0",
	])
		expect((await run(suffix)).status).toBe(404);
	expect(global.fetch).not.toHaveBeenCalled();
});

it("returns only changed project sections and skips snapshot loading when that revision is unchanged", async () => {
	const initial = {
		version: "v1",
		settings: { siteId: "site" },
		index: { drawings: [] },
		drawings: [],
		diary: { rows: [] },
		config: { label: "before" },
		forma2: {},
	};
	jest.mocked(loadLimeniProjectSnapshot).mockResolvedValue(initial as never);
	const first = await project(
		new Request("https://test/api/sites/site/limeni-project"),
		context,
	);
	const cached = await first.json();
	expect(cached.revision).toBe("revision");
	jest.mocked(loadProjectManifest).mockResolvedValue({
		revision: "changed-revision",
		sourceVersions: {},
		diaryRowVersions: {},
		organizationId: "limeni",
	});
	jest.mocked(loadLimeniProjectSnapshot).mockResolvedValue({
		...initial,
		version: "v2",
		config: { label: "after" },
	} as never);
	const second = await project(
		new Request("https://test/api/sites/site/limeni-project", {
			headers: {
				"If-None-Match": '"revision"',
				"X-Project-Parts": JSON.stringify(cached.partVersions),
			},
		}),
		context,
	);
	const delta = await second.json();
	expect(delta.kind).toBe("delta");
	expect(delta.changes).toEqual({ config: { label: "after" } });
	expect(delta.drawings).toEqual([]);
	const unchanged = await project(
		new Request("https://test/api/sites/site/limeni-project", {
			headers: { "If-None-Match": '"changed-revision"' },
		}),
		context,
	);
	expect(unchanged.status).toBe(304);
	expect(loadLimeniProjectSnapshot).toHaveBeenCalledTimes(2);
});
