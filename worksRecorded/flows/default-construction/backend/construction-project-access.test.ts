import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { getAuthorizedProjectSite } from "@/lib/projects/authorized-project-site";
import { requireConstructionProjectAccess } from "./construction-project-access";

jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: jest.fn(),
}));
jest.mock("@/lib/projects/authorized-project-site", () => ({
	getAuthorizedProjectSite: jest.fn(),
}));
const originalStructuredClone = globalThis.structuredClone;
beforeAll(() => {
	globalThis.structuredClone = <T>(value: T) =>
		JSON.parse(JSON.stringify(value)) as T;
});
afterAll(() => {
	globalThis.structuredClone = originalStructuredClone;
});
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getAuthorizedProjectSite).mockResolvedValue({
		id: "site",
		name: "Project",
		organizationId: "org",
		bisCaseId: null,
		bisCaseNumber: null,
		siteDiaryRecordsMap: {},
		organization: { orgLanguage: "lv" },
	} as never);
	jest
		.mocked(resolveFlowModuleKeyForRuntime)
		.mockResolvedValue("default-construction");
});
it("authorizes a regular construction project and derives its language and diary configuration", async () => {
	expect(await requireConstructionProjectAccess("user", "site")).toMatchObject({
		organizationId: "org",
		bisCaseId: null,
		organizationLanguage: "lv",
		diaryConfig: {
			otherSettings: expect.objectContaining({
				inlineDiaryPhotos: false,
				visualConstruction: false,
			}),
		},
	});
	expect(getAuthorizedProjectSite).toHaveBeenCalledWith("user", "site");
});
it("defaults a missing project language to English and builds the fallback diary configuration", async () => {
	jest.mocked(getAuthorizedProjectSite).mockResolvedValue({
		id: "site",
		name: "Project",
		organizationId: "org",
		bisCaseId: null,
		bisCaseNumber: null,
		siteDiaryRecordsMap: null,
		organization: { orgLanguage: null },
	} as never);
	const access = await requireConstructionProjectAccess("user", "site");
	expect(access.organizationLanguage).toBe("en");
	expect(access.diaryConfig).toEqual(
		expect.objectContaining({
			otherSettings: expect.objectContaining({
				inlineDiaryPhotos: false,
				visualConstruction: false,
			}),
		}),
	);
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
		bisCaseNumber: "BIS-123",
		siteDiaryRecordsMap: { otherSettings: { fimaCollaboration: true } },
		organization: { orgLanguage: "lv" },
	} as never);
	await expect(
		requireConstructionProjectAccess("user", "site"),
	).rejects.toThrow("unavailable");
});
