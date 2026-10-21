import { GET as project } from "@/app/api/sites/[siteId]/limeni-project/route";
import { GET as preview } from "@/app/api/sites/[siteId]/visual/[drawingId]/preview/[page]/route";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { previewSource } from "./preview-revision";
import {
	loadLimeniProjectSnapshot,
	ProjectAccessError,
} from "./project-snapshot-store";
import { requireVisualAccess } from "./store";

jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("@/lib/utils/db", () => ({
	prisma: { documents: { findFirst: jest.fn() } },
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
		headers: { "If-None-Match": '"version"' },
	});
	const response = await project(request, context);
	expect(response.status).toBe(304);
	expect(loadLimeniProjectSnapshot).toHaveBeenCalledWith("user", "site");
	expect(response.headers.get("cache-control")).toBe("private, no-cache");
	jest
		.mocked(loadLimeniProjectSnapshot)
		.mockRejectedValue(new ProjectAccessError("Denied"));
	expect((await project(request, context)).status).toBe(403);
	jest
		.mocked(loadLimeniProjectSnapshot)
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
