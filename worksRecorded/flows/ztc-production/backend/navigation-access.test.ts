import { GET } from "@/app/api/ztc/navigation/route";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";

const mockUser = jest.fn();
const mockAccount = jest.fn();
const mockSites = jest.fn();
const mockFlow = jest.fn();
jest.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
	getKindeServerSession: () => ({ getUser: mockUser }),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		user: { findUnique: (...args: unknown[]) => mockAccount(...args) },
		site: { findMany: (...args: unknown[]) => mockSites(...args) },
	},
}));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: (...args: unknown[]) => mockFlow(...args),
}));

const originalResponse = globalThis.Response;
beforeAll(() => {
	Object.assign(globalThis, {
		Response: {
			json(body: unknown, init?: ResponseInit) {
				return {
					status: init?.status ?? 200,
					headers: init?.headers,
					json: async () => body,
				};
			},
		},
	});
});
afterAll(() => {
	globalThis.Response = originalResponse;
});
beforeEach(() => {
	jest.clearAllMocks();
	mockUser.mockResolvedValue({ id: "user" });
	mockAccount.mockResolvedValue({ organizationId: "org" });
	mockFlow.mockResolvedValue(FLOW_MODULE_KEYS.ZTC_PRODUCTION);
	mockSites.mockResolvedValue([
		{ id: "site", name: "Project", description: null, imageUrl: null },
	]);
});

it("returns only the signed-in organization's project catalog without diary payloads", async () => {
	const response = await GET();
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({
		userId: "user",
		organizationId: "org",
		projects: [
			{ id: "site", name: "Project", description: null, imageUrl: null },
		],
	});
	expect(mockAccount).toHaveBeenCalledWith({
		where: { id: "user" },
		select: { organizationId: true },
	});
	expect(mockSites).toHaveBeenCalledWith({
		where: { organizationId: "org" },
		select: { id: true, name: true, description: true, imageUrl: true },
		orderBy: { createdAt: "desc" },
	});
	expect(response.headers).toEqual({ "Cache-Control": "private, no-store" });
});

it("does not query project data without a session", async () => {
	mockUser.mockResolvedValue(null);
	expect((await GET()).status).toBe(401);
	expect(mockAccount).not.toHaveBeenCalled();
	expect(mockSites).not.toHaveBeenCalled();
});

it("rejects an account without an organization", async () => {
	mockAccount.mockResolvedValue(null);
	expect((await GET()).status).toBe(403);
	expect(mockSites).not.toHaveBeenCalled();
});

it("rejects an organization that no longer uses ZTC", async () => {
	mockFlow.mockResolvedValue(FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION);
	expect((await GET()).status).toBe(403);
	expect(mockSites).not.toHaveBeenCalled();
});
