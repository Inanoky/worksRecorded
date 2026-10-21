import { GET as project } from "@/app/api/sites/[siteId]/limeni-project/route";
import { GET as preview } from "@/app/api/sites/[siteId]/visual/[drawingId]/preview/[page]/route";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { previewSource } from "./preview-revision";
import { loadProjectRevision } from "./project-revision-store";
import {
	loadLimeniProjectSnapshot,
	ProjectAccessError,
} from "./project-snapshot-store";
import { requireVisualAccess } from "./store";

jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("@/lib/utils/db", () => ({
	prisma: { documents: { findFirst: jest.fn() } },
}));
jest.mock("./project-revision-store", () => ({
	loadProjectRevision: jest.fn(),
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
	jest.mocked(loadProjectRevision).mockResolvedValue("revision");
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

it("revalidates a project snapshot only after authentication and an authorized load", async () => {
	const request = new Request("https://test/api/sites/site/limeni-project", {
		headers: { "If-None-Match": '"revision"' },
	});
	const response = await project(request, context);
	expect(response.status).toBe(304);
	expect(loadProjectRevision).toHaveBeenCalledWith("user", "site");
	expect(loadLimeniProjectSnapshot).not.toHaveBeenCalled();
	expect(response.headers.get("cache-control")).toBe("private, no-cache");
	jest
		.mocked(loadProjectRevision)
		.mockRejectedValue(new ProjectAccessError("Denied"));
	expect((await project(request, context)).status).toBe(403);
	jest
		.mocked(loadProjectRevision)
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
	jest.mocked(loadProjectRevision).mockResolvedValue("changed-revision");
	jest
		.mocked(loadLimeniProjectSnapshot)
		.mockResolvedValue({
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
