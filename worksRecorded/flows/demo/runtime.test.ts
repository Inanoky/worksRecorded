import { getFlowAssignmentForOrganization } from "@/lib/flows/assignments-server";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";

jest.mock("@/lib/flows/assignments-server", () => ({
	getFlowAssignmentForOrganization: jest.fn(),
}));
jest.mock("@/lib/production-flow/config-server", () => ({
	resolveProductionFlowConfigForRuntime: jest.fn(async () => null),
}));

it.each([
	["demo", "default-construction"],
	["fima", "fima"],
	["ztc-production", "ztc-production"],
])("routes %s to the existing %s runtime", async (assigned, expected) => {
	jest.mocked(getFlowAssignmentForOrganization).mockResolvedValue({
		organizationId: "org",
		flowModuleKey: assigned,
		enabled: true,
		createdAt: new Date("2026-11-08T00:00:00Z"),
		updatedAt: new Date("2026-11-08T00:00:00Z"),
	});
	await expect(
		resolveFlowModuleKeyForRuntime({ organizationId: "org" }),
	).resolves.toBe(expected);
});
