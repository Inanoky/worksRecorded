const mockGetAssignment = jest.fn();
const mockFindOverrides = jest.fn();

jest.mock("@/lib/flows/assignments-server", () => ({
	getFlowAssignmentForOrganization: (...args: unknown[]) =>
		mockGetAssignment(...args),
}));

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		productionFlowConfigOverride: {
			findMany: (...args: unknown[]) => mockFindOverrides(...args),
		},
	},
}));

import {
	loadProductionFlowResolutionData,
	resolveProductionFlowConfigForRuntime,
} from "./config-server";

beforeEach(() => {
	jest.clearAllMocks();
	mockGetAssignment.mockResolvedValue(null);
	mockFindOverrides.mockResolvedValue([]);
});

it("loads the assignment and production overrides once", async () => {
	await expect(loadProductionFlowResolutionData("org")).resolves.toMatchObject({
		assignment: null,
		configs: expect.any(Array),
	});

	expect(mockGetAssignment).toHaveBeenCalledTimes(1);
	expect(mockGetAssignment).toHaveBeenCalledWith("org");
	expect(mockFindOverrides).toHaveBeenCalledTimes(1);
});

it("reuses preloaded resolution data without another database read", async () => {
	await expect(
		resolveProductionFlowConfigForRuntime(
			{ organizationId: "org", siteId: "site" },
			{ assignment: null, configs: [] },
		),
	).resolves.toBeNull();

	expect(mockGetAssignment).not.toHaveBeenCalled();
	expect(mockFindOverrides).not.toHaveBeenCalled();
});
