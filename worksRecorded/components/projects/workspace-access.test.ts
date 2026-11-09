const mockUser = jest.fn();
const mockAccess = jest.fn();
const mockFlow = jest.fn();
jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("next/navigation", () => ({
	notFound: () => {
		throw new Error("not-found");
	},
}));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: () => mockUser() }));
jest.mock("@/lib/projects/authorized-project-site", () => ({
	getAuthorizedProjectSite: (...args: unknown[]) => mockAccess(...args),
}));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: (...args: unknown[]) => mockFlow(...args),
}));

import { getWorkspaceAccess } from "./workspace-access";

beforeEach(() => {
	jest.clearAllMocks();
	mockUser.mockResolvedValue({ id: "user" });
	mockAccess.mockResolvedValue({
		id: "site",
		name: "Project",
		organizationId: "org",
		bisCaseId: "case",
		siteDiaryRecordsMap: { otherSettings: { fimaCollaboration: true } },
	});
	mockFlow.mockResolvedValue("default-construction");
});
it("authorizes the user against the requested project and returns only workspace capabilities", async () => {
	expect(await getWorkspaceAccess("site")).toEqual({
		siteId: "site",
		name: "Project",
		userId: "user",
		organizationId: "org",
		flowModuleKey: "default-construction",
		visualPreload: false,
		fimaActs: true,
		constructionWorkspace: false,
	});
	expect(mockAccess).toHaveBeenCalledWith("user", "site");
	expect(mockFlow).toHaveBeenCalledWith({
		siteId: "site",
		organizationId: "org",
	});
});
it("denies revoked access before reading configuration", async () => {
	mockAccess.mockResolvedValue(null);
	await expect(getWorkspaceAccess("site")).rejects.toThrow("not-found");
	expect(mockFlow).not.toHaveBeenCalled();
});
it("enables standard construction caching without enabling the Limeni or FIMA views", async () => {
	mockAccess.mockResolvedValue({
		id: "site",
		name: "Project",
		organizationId: "org",
		bisCaseId: null,
		siteDiaryRecordsMap: {},
	});
	expect(await getWorkspaceAccess("site")).toMatchObject({
		constructionWorkspace: true,
		visualPreload: false,
		fimaActs: false,
	});
});

it("reports cold workspace access phases without changing the result", async () => {
	const phases: string[] = [];
	const trace = {
		measure: async <T>(phase: string, task: () => T | Promise<T>) => {
			phases.push(phase);
			return task();
		},
	};

	await expect(getWorkspaceAccess("site", trace)).resolves.toMatchObject({
		siteId: "site",
		flowModuleKey: "default-construction",
	});
	expect(phases).toEqual([
		"workspaceAuth",
		"workspaceSiteAccess",
		"workspaceFlow",
	]);
});
