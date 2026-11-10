const mockUserFindUnique = jest.fn();
const mockSiteFindMany = jest.fn();
const mockResolveFlowModuleKeyForRuntime = jest.fn();
const mockIsSuperUserId = jest.fn();
const mockTraceEnd = jest.fn();
const mockTraceFail = jest.fn();

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		user: {
			findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
		},
		site: {
			findMany: (...args: unknown[]) => mockSiteFindMany(...args),
		},
	},
}));

jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: (...args: unknown[]) =>
		mockResolveFlowModuleKeyForRuntime(...args),
}));

jest.mock("@/lib/utils/super-user", () => ({
	isSuperUserId: (...args: unknown[]) => mockIsSuperUserId(...args),
}));

jest.mock("@/lib/observability/perf", () => ({
	createPerfTrace: () => ({
		measure: async (_phase: string, task: () => unknown) => task(),
		end: (...args: unknown[]) => mockTraceEnd(...args),
		fail: (...args: unknown[]) => mockTraceFail(...args),
	}),
}));

import { DEMO_ORGANIZATION_ID, DEMO_SITE_ID } from "@/flows/demo/constants";
import { loadDashboardRequestData } from "./dashboard-request-data";

describe("dashboard request data", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockIsSuperUserId.mockReturnValue(false);
		mockUserFindUnique.mockResolvedValue({
			email: "user@example.com",
			phone: "+37120000000",
			userTour: {},
			organizationId: "org-1",
			organization: { name: "Company", orgLanguage: "lv" },
		});
		mockSiteFindMany.mockResolvedValue([{ id: "site-1" }]);
		mockResolveFlowModuleKeyForRuntime.mockResolvedValue(
			"default-construction",
		);
	});

	it("loads the account, sites, and flow once for an organization member", async () => {
		const result = await loadDashboardRequestData("member-1");

		expect(result).toMatchObject({
			organizationId: "org-1",
			flowModuleKey: "default-construction",
			isSuperUser: false,
			sites: [{ id: "site-1" }],
		});
		expect(mockUserFindUnique).toHaveBeenCalledTimes(1);
		expect(mockSiteFindMany).toHaveBeenCalledTimes(1);
		expect(mockSiteFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					OR: [
						{ organizationId: "org-1" },
						{
							id: DEMO_SITE_ID,
							organizationId: DEMO_ORGANIZATION_ID,
							userId: "member-1",
						},
					],
				},
			}),
		);
		expect(mockResolveFlowModuleKeyForRuntime).toHaveBeenCalledTimes(1);
		expect(mockTraceEnd).toHaveBeenCalledWith({
			status: 200,
			extra: { siteCount: 1, isSuperUser: false },
		});
	});

	it("loads unrestricted sites without resolving a flow for a superuser", async () => {
		mockIsSuperUserId.mockReturnValue(true);

		const result = await loadDashboardRequestData("superuser-1");

		expect(result.organizationId).toBeNull();
		expect(result.flowModuleKey).toBeNull();
		expect(mockSiteFindMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: {} }),
		);
		expect(mockResolveFlowModuleKeyForRuntime).not.toHaveBeenCalled();
	});
});
