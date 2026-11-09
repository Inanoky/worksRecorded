const mockLoadResolutionData = jest.fn();
const mockResolveProductionConfig = jest.fn();

jest.mock("@/lib/production-flow/config-server", () => ({
	loadProductionFlowResolutionData: (...args: unknown[]) =>
		mockLoadResolutionData(...args),
	resolveProductionFlowConfigForRuntime: (...args: unknown[]) =>
		mockResolveProductionConfig(...args),
}));

import { TGEM_ORGANIZATION_ID } from "@/lib/client-flows/constants";
import { resolveFlowModuleKeyForRuntime } from "./resolve-flow-module-server";

beforeEach(() => {
	jest.clearAllMocks();
	mockLoadResolutionData.mockResolvedValue({
		assignment: null,
		configs: [],
	});
	mockResolveProductionConfig.mockResolvedValue(null);
});

it("keeps the TGEM flow override without loading production configuration", async () => {
	await expect(
		resolveFlowModuleKeyForRuntime({
			organizationId: TGEM_ORGANIZATION_ID,
			siteId: "site",
		}),
	).resolves.toBe("tgem-invoice-approval");

	expect(mockLoadResolutionData).not.toHaveBeenCalled();
	expect(mockResolveProductionConfig).not.toHaveBeenCalled();
});

it("uses an enabled assignment from the single resolution-data load", async () => {
	mockLoadResolutionData.mockResolvedValue({
		assignment: {
			organizationId: "org",
			flowModuleKey: "fima",
			enabled: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		configs: [],
	});

	await expect(
		resolveFlowModuleKeyForRuntime({ organizationId: "org", siteId: "site" }),
	).resolves.toBe("fima");

	expect(mockLoadResolutionData).toHaveBeenCalledTimes(1);
	expect(mockLoadResolutionData).toHaveBeenCalledWith("org");
	expect(mockResolveProductionConfig).not.toHaveBeenCalled();
});

it("reuses loaded assignment and overrides for production fallback resolution", async () => {
	const resolutionData = {
		assignment: null,
		configs: [{ key: "custom-production" }],
	};
	mockLoadResolutionData.mockResolvedValue(resolutionData);
	mockResolveProductionConfig.mockResolvedValue({
		flowModuleKey: "ztc-production",
	});
	const args = { organizationId: "org", siteId: "site" };

	await expect(resolveFlowModuleKeyForRuntime(args)).resolves.toBe(
		"ztc-production",
	);

	expect(mockLoadResolutionData).toHaveBeenCalledTimes(1);
	expect(mockResolveProductionConfig).toHaveBeenCalledWith(
		args,
		resolutionData,
	);
});

it("keeps default construction as the final fallback", async () => {
	await expect(
		resolveFlowModuleKeyForRuntime({ organizationId: "org", siteId: "site" }),
	).resolves.toBe("default-construction");
});
