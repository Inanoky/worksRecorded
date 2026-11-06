import { loadWorkspaceCatalogRevision } from "@/components/projects/workspace-catalog";
import { requireUser } from "@/lib/utils/requireUser";
import { GET } from "./route";

jest.mock("@/components/projects/workspace-catalog", () => ({
	loadWorkspaceCatalogRevision: jest.fn(),
}));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
const original = { Request: global.Request, Response: global.Response };
beforeAll(() =>
	Object.assign(
		global,
		jest.requireActual("next/dist/compiled/@edge-runtime/primitives/fetch"),
	),
);
afterAll(() => Object.assign(global, original));
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(requireUser).mockResolvedValue({ id: "user" } as never);
	jest
		.mocked(loadWorkspaceCatalogRevision)
		.mockResolvedValue({ scope: "user:org", revision: "r1" });
});
it("returns a bodyless unchanged response scoped to the authenticated identity", async () => {
	const response = await GET(
		new Request("https://test", {
			headers: { "If-None-Match": '"user:org:r1"' },
		}),
	);
	expect(response.status).toBe(304);
	expect(await response.text()).toBe("");
	expect(loadWorkspaceCatalogRevision).toHaveBeenCalledWith("user");
});
it("does not accept another identity's revision as a cache hit", async () => {
	const response = await GET(
		new Request("https://test", {
			headers: { "If-None-Match": '"other:org:r1"' },
		}),
	);
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ scope: "user:org", revision: "r1" });
});
it("checks authentication before looking up the project catalog", async () => {
	jest.mocked(requireUser).mockRejectedValue(new Error("Login required"));
	expect((await GET(new Request("https://test"))).status).toBe(401);
	expect(loadWorkspaceCatalogRevision).not.toHaveBeenCalled();
});
