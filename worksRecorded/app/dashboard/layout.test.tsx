jest.mock("@/components/dashboard/DashboardSettingsProvider", () => ({
  DashboardSettingsProvider: ({children}: {children: React.ReactNode}) => <>{children}</>,
  DashboardSettingsContent: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));
import { render, screen } from "@testing-library/react";

const mockRequireUser = jest.fn();
const mockIsSuperUserId = jest.fn();
const mockResolveFlowModuleKeyForRuntime = jest.fn();
const mockLoadTgemAccessScope = jest.fn();
const mockVisibleTgemSites = jest.fn();
const mockSiteFindMany = jest.fn();
const mockOrganizationFindUnique = jest.fn();
const mockGetOrganizationIdByUserId = jest.fn();

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
jest.mock("@/components/providers/ProjectLoadingProgressProvider", () => ({
	ProjectLoadingProgressProvider: ({
		children,
	}: {
		children: React.ReactNode;
	}) => <>{children}</>,
}));
jest.mock("@/components/sitediary/FimaWarehouseProvider", () => ({
	FimaWarehouseProvider: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
	FimaProjectWarehousePreload: () => null,
}));
jest.mock("@/flows/default-construction/frontend/DiarySaveProvider", () => ({
	DiarySaveProvider: ({ children }: { children: React.ReactNode }) => (
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
		organization: {
			findUnique: (...args: unknown[]) => mockOrganizationFindUnique(...args),
		},
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
	getOrganizationIdByUserId: (...args: unknown[]) =>
		mockGetOrganizationIdByUserId(...args),
}));

import { LIMENI_ORGANIZATION_ID } from "@/flows/default-construction/lib/diary-photos";
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
		mockOrganizationFindUnique.mockResolvedValue({ name: "Other company" });
		mockGetOrganizationIdByUserId.mockResolvedValue("org-1");
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
		expect(
			screen.queryByRole("img", { name: "Līmenī" }),
		).not.toBeInTheDocument();
		expect(document.documentElement.dataset.limeniSuite).toBeUndefined();
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
		expect(mockOrganizationFindUnique).not.toHaveBeenCalled();
		expect(
			screen.queryByRole("img", { name: "Līmenī" }),
		).not.toBeInTheDocument();
		expect(document.documentElement.dataset.limeniSuite).toBeUndefined();
	});

	it("uses Limeni's own organization for suite branding, rather than visible projects or the company name", async () => {
		mockGetOrganizationIdByUserId.mockResolvedValue(LIMENI_ORGANIZATION_ID);
		mockOrganizationFindUnique.mockResolvedValue({ name: "SIA M.S.AQUA" });
		mockResolveFlowModuleKeyForRuntime.mockResolvedValue(
			"default-construction",
		);
		const { container, unmount } = render(
			await DashboardLayout({ children: <div>Page</div> }),
		);
		expect(
			screen.getByRole("link", {
				name: "WorksRecorded — Līmenī business suite",
			}),
		).toBeInTheDocument();
		expect(screen.getByRole("img", { name: "Līmenī" })).toBeInTheDocument();
		expect(screen.getByText("business suite")).toBeInTheDocument();
		expect(container.querySelector(".limeni-suite")).not.toBeNull();
		expect(document.documentElement.dataset.limeniSuite).toBe("true");
		expect(document.documentElement.dataset.fimaSuite).toBeUndefined();
		expect(document.documentElement.dataset.prodevSuite).toBeUndefined();
		unmount();
		expect(document.documentElement.dataset.limeniSuite).toBeUndefined();
	});

	it("does not apply Limeni branding to another organization viewing a Limeni project", async () => {
		mockOrganizationFindUnique.mockResolvedValue({ name: "Līmenī" });
		mockSiteFindMany.mockResolvedValue([
			{ ...projects[0], organizationId: LIMENI_ORGANIZATION_ID },
		]);
		render(await DashboardLayout({ children: <div>Page</div> }));
		expect(
			screen.queryByRole("img", { name: "Līmenī" }),
		).not.toBeInTheDocument();
		expect(document.documentElement.dataset.limeniSuite).toBeUndefined();
	});

	it("shows ProDev business suite branding only for the signed-in organization", async () => {
		mockOrganizationFindUnique.mockResolvedValue({ name: "ProDev" });
		mockResolveFlowModuleKeyForRuntime.mockResolvedValue(
			"default-construction",
		);
		const { container } = render(
			await DashboardLayout({ children: <div>Page</div> }),
		);
		expect(mockOrganizationFindUnique).toHaveBeenCalledWith({
			where: { id: "org-1" },
			select: { name: true },
		});
		expect(screen.getByAltText("PRO DEV")).toBeInTheDocument();
		expect(screen.getByText("business suite")).toBeInTheDocument();
		expect(container.querySelector(".prodev-suite")).not.toBeNull();
		expect(document.documentElement.dataset.prodevSuite).toBe("true");
		expect(screen.queryByAltText("FIMA")).not.toBeInTheDocument();
		expect(document.documentElement.dataset.limeniSuite).toBeUndefined();
	});

	it("keeps FIMA branding separate from ProDev", async () => {
		mockOrganizationFindUnique.mockResolvedValue({ name: "FIMA" });
		mockSiteFindMany.mockResolvedValue([
			{
				...projects[0],
				siteDiaryRecordsMap: { otherSettings: { fimaCollaboration: true } },
			},
		]);
		mockResolveFlowModuleKeyForRuntime.mockResolvedValue(
			"default-construction",
		);
		render(await DashboardLayout({ children: <div>Page</div> }));
		expect(screen.getByAltText("FIMA")).toBeInTheDocument();
		expect(screen.queryByAltText("PRO DEV")).not.toBeInTheDocument();
		expect(document.documentElement.dataset.prodevSuite).toBeUndefined();
		expect(document.documentElement.dataset.limeniSuite).toBeUndefined();
	});
});
