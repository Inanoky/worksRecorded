import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { prisma } from "@/lib/utils/db";
import { orgCheck } from "@/server/actions/shared-actions";
import { requireConstructionProjectAccess } from "./construction-project-access";

jest.mock("@/lib/utils/db", () => ({
	prisma: { site: { findFirst: jest.fn() } },
}));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: jest.fn(),
}));
jest.mock("@/server/actions/shared-actions", () => ({ orgCheck: jest.fn() }));
beforeEach(() => {
	jest.clearAllMocks();
	jest
		.mocked(orgCheck)
		.mockResolvedValue({ id: "site", name: "Project", organizationId: "org" });
	jest
		.mocked(resolveFlowModuleKeyForRuntime)
		.mockResolvedValue("default-construction");
	jest
		.mocked(prisma.site.findFirst)
		.mockResolvedValue({ bisCaseId: null, siteDiaryRecordsMap: {} } as never);
});
it("authorizes a regular construction project without a customer-specific organization ID", async () => {
	expect(await requireConstructionProjectAccess("user", "site")).toEqual({
		organizationId: "org",
	});
	expect(orgCheck).toHaveBeenCalledWith("user", "site");
	expect(prisma.site.findFirst).toHaveBeenCalledWith(
		expect.objectContaining({ where: { id: "site", organizationId: "org" } }),
	);
});
it("rejects revoked access before reading project data", async () => {
	jest.mocked(orgCheck).mockResolvedValue(false);
	await expect(
		requireConstructionProjectAccess("user", "site"),
	).rejects.toThrow("denied");
	expect(prisma.site.findFirst).not.toHaveBeenCalled();
});
it.each(["ztc-production", "tgem-invoice-approval", "fima"] as const)(
	"preserves the separate %s flow",
	async (flow) => {
		jest.mocked(resolveFlowModuleKeyForRuntime).mockResolvedValue(flow);
		await expect(
			requireConstructionProjectAccess("user", "site"),
		).rejects.toThrow("unavailable");
		expect(prisma.site.findFirst).not.toHaveBeenCalled();
	},
);
it("preserves the FIMA collaboration workspace inside default construction", async () => {
	jest.mocked(prisma.site.findFirst).mockResolvedValue({
		bisCaseId: "123",
		siteDiaryRecordsMap: { otherSettings: { fimaCollaboration: true } },
	} as never);
	await expect(
		requireConstructionProjectAccess("user", "site"),
	).rejects.toThrow("unavailable");
});
