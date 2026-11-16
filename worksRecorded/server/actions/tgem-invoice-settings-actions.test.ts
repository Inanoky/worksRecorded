const mockUser = jest.fn();
const mockSite = jest.fn();
const mockScope = jest.fn();
const mockPermission = jest.fn();
const mockPlatformAdmin = jest.fn();
const mockCostCodes = jest.fn();
const mockApproval = jest.fn();
const mockSubmitters = jest.fn();
const mockAccess = jest.fn();

jest.mock("next/headers", () => ({
	headers: async () => new Headers({ host: "localhost" }),
}));
jest.mock("next/navigation", () => ({
	notFound: () => {
		throw new Error("not found");
	},
}));
jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: async () => ({ id: "user-1" }),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		user: { findFirst: (...args: unknown[]) => mockUser(...args) },
		site: { findFirst: (...args: unknown[]) => mockSite(...args) },
	},
}));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: async () => "tgem-invoice-approval",
}));
jest.mock("@/lib/production-flow/config", () => ({
	canAccessFlowConfigAdmin: (...args: unknown[]) => mockPlatformAdmin(...args),
}));
jest.mock("@/lib/tgem-invoice-approval/access", () => ({
	loadTgemAccessScope: (...args: unknown[]) => mockScope(...args),
	canTgem: (...args: unknown[]) => mockPermission(...args),
}));
jest.mock("@/server/actions/tgem-cost-code-actions", () => ({
	getTgemCostCodes: (...args: unknown[]) => mockCostCodes(...args),
}));
jest.mock("@/server/actions/tgem-invoice-approval-actions", () => ({
	getTgemApprovalSetupData: (...args: unknown[]) => mockApproval(...args),
	getTgemSubmitterApprovalFlowSettings: (...args: unknown[]) =>
		mockSubmitters(...args),
}));
jest.mock("@/server/actions/tgem-access-actions", () => ({
	getTgemSiteAccessData: (...args: unknown[]) => mockAccess(...args),
}));

import { getTgemInvoiceSettingsData } from "./tgem-invoice-settings-actions";

beforeEach(() => {
	jest.clearAllMocks();
	mockUser.mockResolvedValue({
		organizationId: "org-1",
		organization: { orgLanguage: "lv" },
	});
	mockSite.mockResolvedValue({
		id: "site-1",
		name: "Project",
		userId: "owner-1",
	});
	mockScope.mockResolvedValue({});
	mockPermission.mockReturnValue(true);
	mockPlatformAdmin.mockReturnValue(false);
	mockCostCodes.mockResolvedValue([]);
	mockApproval.mockResolvedValue({
		project: { id: "site-1", name: "Project" },
		setup: null,
	});
	mockSubmitters.mockResolvedValue({ users: [], flows: [] });
	mockAccess.mockResolvedValue({
		id: "site-1",
		organizationId: "org-1",
		organization: { tgemAccessGroups: [], users: [] },
	});
});

it("returns account-scoped settings without administrative access data for an ordinary member", async () => {
	const data = await getTgemInvoiceSettingsData("site-1");
	expect(data.scope).toBe(JSON.stringify(["user-1", "org-1"]));
	expect(data.access).toBeNull();
	expect(data.deletableProject).toBeNull();
	expect(mockAccess).not.toHaveBeenCalled();
	expect(mockSite).toHaveBeenCalledWith(
		expect.objectContaining({
			where: { id: "site-1", organizationId: "org-1" },
		}),
	);
});

it("includes project membership settings only for the project owner", async () => {
	mockSite.mockResolvedValue({
		id: "site-1",
		name: "Project",
		userId: "user-1",
	});
	const data = await getTgemInvoiceSettingsData("site-1");
	expect(mockAccess).toHaveBeenCalledWith("site-1");
	expect(data.access).toEqual(
		expect.objectContaining({
			siteId: "site-1",
			organizationId: "org-1",
			canEditGroups: false,
		}),
	);
	expect(data.deletableProject).toEqual({ id: "site-1", name: "Project" });
});

it("rejects projects outside the current organization before loading their settings", async () => {
	mockSite.mockResolvedValue(null);
	await expect(getTgemInvoiceSettingsData("foreign-site")).rejects.toThrow(
		"not found",
	);
	expect(mockApproval).not.toHaveBeenCalled();
	expect(mockAccess).not.toHaveBeenCalled();
	expect(mockCostCodes).not.toHaveBeenCalled();
});

it("rejects project settings when the member lacks project visibility", async () => {
	mockPermission.mockReturnValue(false);
	await expect(getTgemInvoiceSettingsData("site-1")).rejects.toThrow(
		"not found",
	);
	expect(mockApproval).not.toHaveBeenCalled();
	expect(mockAccess).not.toHaveBeenCalled();
});

it("rejects an inactive or unavailable account before loading settings", async () => {
	mockUser.mockResolvedValue(null);
	await expect(getTgemInvoiceSettingsData(null)).rejects.toThrow("not found");
	expect(mockCostCodes).not.toHaveBeenCalled();
});
