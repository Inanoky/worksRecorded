import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { loadProductionFlowResolutionData } from "@/lib/production-flow/config-server";

jest.mock("@/lib/production-flow/config-server", () => ({
	loadProductionFlowResolutionData: jest.fn(),
	resolveProductionFlowConfigForRuntime: jest.fn(async () => null),
}));

it.each([
	["demo", "default-construction"],
	["fima", "fima"],
	["ztc-production", "ztc-production"],
])("routes %s to the existing %s runtime", async (assigned, expected) => {
	jest.mocked(loadProductionFlowResolutionData).mockResolvedValue({
		assignment: {
			organizationId: "org",
			flowModuleKey: assigned,
			enabled: true,
			createdAt: new Date("2026-11-08T00:00:00Z"),
			updatedAt: new Date("2026-11-08T00:00:00Z"),
		},
		configs: [],
	});
	await expect(
		resolveFlowModuleKeyForRuntime({ organizationId: "org" }),
	).resolves.toBe(expected);
});
