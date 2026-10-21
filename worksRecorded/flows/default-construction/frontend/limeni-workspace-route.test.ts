import { GET as results } from "@/app/api/sites/[siteId]/forma2/results/route";
import { GET as settings } from "@/app/api/sites/[siteId]/limeni-workspace/route";
import { GET as planning } from "@/app/api/sites/[siteId]/visual/[drawingId]/planning/route";
import { GET as drawings } from "@/app/api/sites/[siteId]/visual/route";
import { requireUser } from "@/lib/utils/requireUser";
import { getDefaultConstructionForma2Results } from "../backend/forma2-analytics-actions";
import { getVisualDrawings, getVisualPlanning } from "../visual/actions";
import { requireVisualAccess } from "../visual/store";

const web = jest.requireActual(
	"next/dist/compiled/@edge-runtime/primitives/fetch",
);
const original = { Request: globalThis.Request, Response: globalThis.Response };
beforeAll(() =>
	Object.assign(globalThis, { Request: web.Request, Response: web.Response }),
);
afterAll(() => Object.assign(globalThis, original));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("../visual/store", () => ({ requireVisualAccess: jest.fn() }));
jest.mock("../backend/forma2-analytics-actions", () => ({
	getDefaultConstructionForma2Results: jest.fn(),
}));
jest.mock("../visual/actions", () => ({
	getVisualDrawings: jest.fn(),
	getVisualPlanning: jest.fn(),
}));
jest.mock("@/server/actions/shared-actions", () => ({
	getOrganizationLanguageByUserId: async () => "lv",
}));
jest.mock("@/lib/bis/dashboard-status", () => ({
	getDashboardBisStatus: async () => ({ enabled: false }),
}));
const context = { params: Promise.resolve({ siteId: "site" }) };
const request = () =>
	new Request("https://worksrecorded.test/api/sites/site/forma2/results");
beforeEach(() => {
	jest.resetAllMocks();
	jest.mocked(requireUser).mockResolvedValue({ id: "user" } as never);
	jest
		.mocked(requireVisualAccess)
		.mockResolvedValue({ organizationId: "limeni" } as never);
	jest
		.mocked(getDefaultConstructionForma2Results)
		.mockResolvedValue({ siteName: "Project", document: null, resultRows: [] });
});

it("loads settings only after authenticating the project and organization", async () => {
	const response = await settings(request(), context);
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({
		siteId: "site",
		userId: "user",
		organizationId: "limeni",
		bisEnabled: false,
		organizationLanguage: "lv",
	});
	expect(requireVisualAccess).toHaveBeenCalledWith("user", "site");
	expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it("rejects another organization before loading Forma 2 or serving a cached response", async () => {
	jest.mocked(requireVisualAccess).mockRejectedValue(new Error("Forbidden"));
	expect((await settings(request(), context)).status).toBe(403);
	expect((await results(request(), context)).status).toBe(403);
	expect(getDefaultConstructionForma2Results).not.toHaveBeenCalled();
});

it("returns unchanged Forma 2 as 304 after rechecking access and sends changed results", async () => {
	const first = await results(request(), context);
	const etag = first.headers.get("etag") ?? "";
	const conditional = new Request(request(), {
		headers: { "If-None-Match": etag },
	});
	expect((await results(conditional, context)).status).toBe(304);
	expect(requireVisualAccess).toHaveBeenCalledTimes(2);
	jest
		.mocked(getDefaultConstructionForma2Results)
		.mockResolvedValue({ siteName: "Changed", document: null, resultRows: [] });
	const changed = await results(conditional, context);
	expect(changed.status).toBe(200);
	expect(changed.headers.get("etag")).not.toBe(etag);
	expect(changed.headers.get("cache-control")).toBe("private, no-cache");
});

it("uses the existing authorized drawing and planning readers for parallel GET requests", async () => {
	jest
		.mocked(getVisualDrawings)
		.mockResolvedValue({ locations: [], drawings: [], userId: "user" });
	jest.mocked(getVisualPlanning).mockResolvedValue({ plans: [] } as never);
	expect((await drawings(request(), context)).status).toBe(200);
	expect(
		(
			await planning(request(), {
				params: Promise.resolve({ siteId: "site", drawingId: "floor" }),
			})
		).status,
	).toBe(200);
	expect(getVisualDrawings).toHaveBeenCalledWith("site");
	expect(getVisualPlanning).toHaveBeenCalledWith("site", "floor");
	jest.mocked(getVisualPlanning).mockRejectedValue(new Error("Forbidden"));
	expect(
		(
			await planning(request(), {
				params: Promise.resolve({ siteId: "site", drawingId: "other" }),
			})
		).status,
	).toBe(403);
});
