const getUser = jest.fn();
const getOrganization = jest.fn();
const getFlow = jest.fn();
const loadPage = jest.fn();
jest.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
	getKindeServerSession: () => ({ getUser }),
}));
jest.mock("@/server/actions/shared-actions", () => ({
	getOrganizationIdByUserId: (...args: unknown[]) => getOrganization(...args),
}));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: (...args: unknown[]) => getFlow(...args),
}));
jest.mock("@/flows/default-construction/backend/fima-diary-page", () => ({
	loadFimaDiaryPage: (...args: unknown[]) => loadPage(...args),
}));
jest.mock("next/server", () => ({
	NextResponse: {
		json: (
			body: unknown,
			init?: { status?: number; headers?: Record<string, string> },
		) => ({
			status: init?.status ?? 200,
			headers: init?.headers,
			json: async () => body,
		}),
	},
}));

import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { GET } from "./route";

const request = (query = "") =>
	({ url: `http://localhost/api/fima/diary-page?${query}` }) as Request;
beforeEach(() => {
	jest.clearAllMocks();
	getUser.mockResolvedValue({ id: "signed-in-user" });
	getOrganization.mockResolvedValue("signed-in-organization");
	getFlow.mockResolvedValue(FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION);
	loadPage.mockResolvedValue({ rows: [], page: 1 });
});

it("rejects anonymous access without querying records", async () => {
	getUser.mockResolvedValue(null);
	expect((await GET(request())).status).toBe(401);
	expect(loadPage).not.toHaveBeenCalled();
});
it("does not expose the endpoint to ZTC", async () => {
	getFlow.mockResolvedValue(FLOW_MODULE_KEYS.ZTC_PRODUCTION);
	expect((await GET(request())).status).toBe(404);
	expect(loadPage).not.toHaveBeenCalled();
});
it.each([
	"project=invalid",
	"page=-1",
	"view=project",
	"page=99999999",
	"from=not-a-date",
	"review=unknown",
	"materials=all",
	"examples=unknown",
	"bis=approved",
	"bisStatus=approving",
])("rejects malformed queries: %s", async (query) => {
	expect((await GET(request(query))).status).toBe(400);
	expect(loadPage).not.toHaveBeenCalled();
});

it("forwards Act search and the actual BIS status alongside the human workflow badge", async () => {
	await GET(
		request(
			"q=KT-668714-2026-00021&bisStatus=pending&review=coordinate_with_fima&page=2",
		),
	);
	expect(loadPage).toHaveBeenCalledWith(
		"signed-in-organization",
		expect.objectContaining({
			keyword: "KT-668714-2026-00021",
			bisStatus: "pending",
			review: "coordinate_with_fima",
			page: 2,
		}),
	);
});
it("takes the organization from the session, never the request, and prevents HTTP caching", async () => {
	const result = await GET(request("page=2&q=walls&organizationId=other"));
	expect(result.status).toBe(200);
	expect(loadPage).toHaveBeenCalledWith(
		"signed-in-organization",
		expect.objectContaining({ page: 2, keyword: "walls" }),
	);
	expect(result.headers).toEqual({ "Cache-Control": "private, no-store" });
});

it.each(["needs_changes", "coordinate_with_fima", "updated", "bis_draft"])(
	"forwards the %s action with combined FIMA filters",
	async (review) => {
		await GET(
			request(
				`review=${review}&bis=missing&materials=missing&examples=present&page=3`,
			),
		);
		expect(loadPage).toHaveBeenCalledWith(
			"signed-in-organization",
			expect.objectContaining({
				review,
				bis: "missing",
				materials: "missing",
				examples: "present",
				page: 3,
			}),
		);
	},
);
