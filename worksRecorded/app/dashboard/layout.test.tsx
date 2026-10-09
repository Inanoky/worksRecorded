import { render, screen } from "@testing-library/react";

const mockRequireUser = jest.fn();
const mockIsSuperUserId = jest.fn();
const mockResolveFlowModuleKeyForRuntime = jest.fn();
const mockLoadTgemAccessScope = jest.fn();
const mockVisibleTgemSites = jest.fn();
const mockSiteFindMany = jest.fn();

jest.mock("@kinde-oss/kinde-auth-nextjs/components", () => ({
	LogoutLink: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("next/headers", () => ({
	headers: async () => ({ get: () => "worksrecorded.com" }),
}));
jest.mock("@/components/dashboard/DashboardItems", () => ({
	DashboardItems: () => <div>Dashboard items</div>,
	DashboardProjectNavigation: ({
		availableProjects = [],
	}: {
		availableProjects?: Array<{ id: string; name: string }>;
	}) => (
		<div data-testid="desktop-projects">
			{availableProjects.map(({ name }) => name).join(",")}
		</div>
	),
}));
jest.mock("@/components/dashboard/MobileMenu", () => ({
	MobileMenu: ({
		availableProjects = [],
	}: {
		availableProjects?: Array<{ id: string; name: string }>;
	}) => (
		<div data-testid="mobile-projects">
			{availableProjects.map(({ name }) => name).join(",")}
		</div>
	),
}));
jest.mock("@/components/dashboard/LanguageFlagSwitcher", () => ({
	LanguageFlagSwitcher: () => <div>Language</div>,
}));
jest.mock("@/components/dashboard/ThemeToggle", () => ({
	ThemeToggle: () => <div>Theme</div>,
}));
jest.mock("@/components/providers/ProjectProvider", () => ({
	ProjectProvider: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
}));
jest.mock("@/components/joyride/user-tour-action", () => ({
	clearUserTourAction: jest.fn(),
}));
jest.mock("@/lib/ai-evals/local-gate", () => ({
	isAiEvalUiEnabled: () => false,
}));
jest.mock("@/lib/dashboard-i18n", () => ({
	getDashboardMessages: () => ({ logOut: "Log out" }),
}));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: (...args: unknown[]) =>
		mockResolveFlowModuleKeyForRuntime(...args),
}));
jest.mock("@/lib/production-flow/config", () => ({
	canAccessFlowConfigAdmin: () => false,
}));
jest.mock("@/lib/tgem-invoice-approval/access", () => ({
	loadTgemAccessScope: (...args: unknown[]) => mockLoadTgemAccessScope(...args),
	visibleTgemSites: (...args: unknown[]) => mockVisibleTgemSites(...args),
}));
jest.mock("@/lib/utils/ai-context-access", () => ({
	hasAiEvalAccess: () => false,
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		site: { findMany: (...args: unknown[]) => mockSiteFindMany(...args) },
	},
}));
jest.mock("@/lib/utils/super-user", () => ({
	isSuperUserId: (...args: unknown[]) => mockIsSuperUserId(...args),
}));
jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));
jest.mock("@/server/actions/shared-actions", () => ({
	getUserEmailByUserId: async () => "user@example.com",
	getOrganizationLanguageByUserId: async () => "lv",
	getOrganizationIdByUserId: async () => "org-1",
}));

import DashboardLayout from "./layout";

const projects = [
	{ id: "site-visible", name: "Visible project" },
	{ id: "site-hidden", name: "Hidden project" },
];

describe("DashboardLayout project visibility", () => {
	beforeEach(() => {
		jest.resetAllMocks();
		mockRequireUser.mockResolvedValue({ id: "user-1" });
		mockIsSuperUserId.mockReturnValue(false);
		mockSiteFindMany.mockResolvedValue(projects);
		mockLoadTgemAccessScope.mockResolvedValue({ organizationId: "org-1" });
		mockVisibleTgemSites.mockReturnValue([projects[0]]);
	});

	it("passes only viewable TGEM projects to desktop and mobile navigation", async () => {
		mockResolveFlowModuleKeyForRuntime.mockResolvedValue(
			"tgem-invoice-approval",
		);

		render(await DashboardLayout({ children: <div>Page</div> }));

		for (const testId of ["desktop-projects", "mobile-projects"]) {
			expect(screen.getByTestId(testId)).toHaveTextContent("Visible project");
			expect(screen.getByTestId(testId)).not.toHaveTextContent(
				"Hidden project",
			);
		}
		expect(mockVisibleTgemSites).toHaveBeenCalledWith(
			expect.objectContaining({ organizationId: "org-1" }),
			projects,
		);
	});

	it("preserves all projects for non-TGEM flows", async () => {
		mockResolveFlowModuleKeyForRuntime.mockResolvedValue(
			"default-construction",
		);

		render(await DashboardLayout({ children: <div>Page</div> }));

		expect(screen.getByTestId("desktop-projects")).toHaveTextContent(
			"Visible project,Hidden project",
		);
		expect(mockLoadTgemAccessScope).not.toHaveBeenCalled();
	});

	it("preserves unrestricted project visibility for global superusers", async () => {
		mockIsSuperUserId.mockReturnValue(true);

		render(await DashboardLayout({ children: <div>Page</div> }));

		expect(screen.getByTestId("mobile-projects")).toHaveTextContent(
			"Visible project,Hidden project",
		);
		expect(mockResolveFlowModuleKeyForRuntime).not.toHaveBeenCalled();
	});
});
