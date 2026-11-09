import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { getAuthorizedProjectSite } from "@/lib/projects/authorized-project-site";
import { requireConstructionProjectAccess } from "./construction-project-access";

jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: jest.fn(),
}));
jest.mock("@/lib/projects/authorized-project-site", () => ({
	getAuthorizedProjectSite: jest.fn(),
}));
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getAuthorizedProjectSite).mockResolvedValue({
		id: "site",
		name: "Project",
		organizationId: "org",
		bisCaseId: null,
		siteDiaryRecordsMap: {},
	} as never);
	jest
		.mocked(resolveFlowModuleKeyForRuntime)
		.mockResolvedValue("default-construction");
});
it("authorizes a regular construction project without a customer-specific organization ID", async () => {
	expect(await requireConstructionProjectAccess("user", "site")).toEqual({
		organizationId: "org",
		bisCaseId: null,
	});
	expect(getAuthorizedProjectSite).toHaveBeenCalledWith("user", "site");
});
it("rejects revoked access before reading project data", async () => {
	jest.mocked(getAuthorizedProjectSite).mockResolvedValue(null);
	await expect(
		requireConstructionProjectAccess("user", "site"),
	).rejects.toThrow("denied");
	expect(resolveFlowModuleKeyForRuntime).not.toHaveBeenCalled();
});
it.each(["ztc-production", "tgem-invoice-approval", "fima"] as const)(
	"preserves the separate %s flow",
	async (flow) => {
		jest.mocked(resolveFlowModuleKeyForRuntime).mockResolvedValue(flow);
		await expect(
			requireConstructionProjectAccess("user", "site"),
		).rejects.toThrow("unavailable");
	},
);
it("preserves the FIMA collaboration workspace inside default construction", async () => {
	jest.mocked(getAuthorizedProjectSite).mockResolvedValue({
		id: "site",
		name: "Project",
		organizationId: "org",
		bisCaseId: "123",
		siteDiaryRecordsMap: { otherSettings: { fimaCollaboration: true } },
	} as never);
	await expect(
		requireConstructionProjectAccess("user", "site"),
	).rejects.toThrow("unavailable");
});
