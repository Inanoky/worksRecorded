import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { ProjectProvider } from "@/components/providers/ProjectProvider";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { DEFAULT_PRODUCTION_FLOW_CONFIG } from "@/lib/production-flow/config";
import { getProjectNavigationRuntimeForSite } from "@/lib/production-flow/runtime-server";
import { DashboardItems, DashboardProjectNavigation } from "./DashboardItems";

let mockPathname = "/dashboard";
const mockPrefetch = jest.fn();

jest.mock("next/navigation", () => ({
	usePathname: () => mockPathname,
	useRouter: () => ({
		prefetch: mockPrefetch,
	}),
}));

type MockLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
	href: string;
	children: ReactNode;
	prefetch?: boolean;
};

jest.mock("next/link", () => ({
	__esModule: true,
	default({
		href,
		onClick,
		children,
		prefetch: _prefetch,
		...props
	}: MockLinkProps) {
		return (
			<a
				href={href}
				onClick={(event: MouseEvent<HTMLAnchorElement>) => {
					event.preventDefault();
					onClick?.(event);
				}}
				{...props}
			>
				{children}
			</a>
		);
	},
}));

jest.mock("@/lib/production-flow/runtime-server", () => ({
	getProjectNavigationRuntimeForSite: jest.fn(),
}));

const getProjectNavigationRuntimeForSiteMock =
	getProjectNavigationRuntimeForSite as jest.MockedFunction<
		typeof getProjectNavigationRuntimeForSite
	>;

beforeAll(() => {
	class ResizeObserverMock {
		observe() {}
		unobserve() {}
		disconnect() {}
	}

	window.ResizeObserver = ResizeObserverMock;
});

describe("dashboard navigation", () => {
	beforeEach(() => {
		mockPathname = "/dashboard";
		mockPrefetch.mockClear();
		window.sessionStorage.clear();
		getProjectNavigationRuntimeForSiteMock.mockReset();
		getProjectNavigationRuntimeForSiteMock.mockResolvedValue(null);
	});

	it("renders global links according to permissions", () => {
		render(
			<DashboardItems
				organizationLanguage="en"
				canAccessAiEvals
				canAccessFlowConfigAdmin
			/>,
		);

		expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
			"href",
			"/dashboard/sites",
		);
		expect(
			screen.getByRole("link", { name: "Organization settings" }),
		).toHaveAttribute("href", "/dashboard/settings");
		expect(screen.getByRole("link", { name: "AI Evals" })).toHaveAttribute(
			"href",
			"/dev/ai-evals",
		);
		expect(screen.getByRole("link", { name: "Flow configs" })).toHaveAttribute(
			"href",
			"/dashboard/admin/flow-configs",
		);
	});

	it("hides permission-gated global links without access", () => {
		render(<DashboardItems organizationLanguage="en" />);

		expect(screen.queryByRole("link", { name: "AI Evals" })).toBeNull();
		expect(screen.queryByRole("link", { name: "Flow configs" })).toBeNull();
	});

	it("does not render project links outside project routes", async () => {
		mockPathname = "/dashboard/sites";
		seedProject("user-projectless", "site-projectless", "Central site");

		render(
			<ProjectProvider userId="user-projectless">
				<DashboardProjectNavigation organizationLanguage="en" />
			</ProjectProvider>,
		);

		await waitFor(() =>
			expect(getProjectNavigationRuntimeForSiteMock).not.toHaveBeenCalled(),
		);
		expect(
			screen.queryByRole("link", { name: "Construction journal" }),
		).toBeNull();
	});

	it("uses runtime labels, hides configured project paths, and marks journal for Joyride", async () => {
		mockPathname = "/dashboard/sites/site-runtime/dashboard";
		seedProject(
			"user-runtime",
			"site-runtime",
			"Very long Latvian project name with multiple construction stages",
		);
		getProjectNavigationRuntimeForSiteMock.mockResolvedValue({
			flowModuleKey: FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION,
			productionConfig: {
				...DEFAULT_PRODUCTION_FLOW_CONFIG,
				labels: {
					...DEFAULT_PRODUCTION_FLOW_CONFIG.labels,
					navigationTitle: "Configured journal",
					navigationTitleLv: "Ražošanas žurnāls",
				},
				navigation: {
					hiddenProjectNavPaths: ["BIS"],
				},
			},
			siteName: "Runtime site",
		});

		const { container } = render(
			<ProjectProvider userId="user-runtime">
				<DashboardProjectNavigation organizationLanguage="lv" />
			</ProjectProvider>,
		);

		expect(
			await screen.findByRole("link", { name: "Ražošanas žurnāls" }),
		).toHaveAttribute("href", "/dashboard/sites/site-runtime/dashboard");
		expect(screen.getByRole("link", { name: "Forma 2" })).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Darba laika uzskaites lapas" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "Noliktava" })).toBeNull();
		expect(
			container.querySelector('[data-tour="nav-site-diary"]'),
		).toHaveAttribute("href", "/dashboard/sites/site-runtime/dashboard");
	});

	it("places project utilities in the More menu without AI Context", async () => {
		mockPathname = "/dashboard/sites/site-utility/settings";
		seedProject("user-utility", "site-utility", "Utility site");
		getProjectNavigationRuntimeForSiteMock.mockResolvedValue({
			flowModuleKey: FLOW_MODULE_KEYS.ZTC_PRODUCTION,
			productionConfig: null,
			siteName: "Utility site",
		});

		render(
			<ProjectProvider userId="user-utility">
				<DashboardProjectNavigation organizationLanguage="en" />
			</ProjectProvider>,
		);

		expect(
			await screen.findByRole("button", { name: "More" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "AI Context" })).toBeNull();
		expect(
			screen.getByRole("link", { name: "Project settings" }),
		).toHaveAttribute("href", "/dashboard/sites/site-utility/settings");
		expect(screen.queryByRole("link", { name: "Forma 2" })).toBeNull();
	});

	it("renders project navigation from the URL when project context is not seeded", async () => {
		mockPathname = "/dashboard/sites/site-direct/dashboard";
		getProjectNavigationRuntimeForSiteMock.mockResolvedValue({
			flowModuleKey: FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION,
			productionConfig: null,
			siteName: "Direct route site",
		});

		render(
			<ProjectProvider userId="user-direct-route">
				<DashboardProjectNavigation organizationLanguage="en" />
			</ProjectProvider>,
		);

		expect(await screen.findByText("Direct route site")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Construction journal" }),
		).toHaveAttribute("href", "/dashboard/sites/site-direct/dashboard");
	});

	it("lets users switch projects from the project dropdown", async () => {
		const user = userEvent.setup();
		mockPathname = "/dashboard/sites/site-current/timesheets";
		seedProject("user-switcher", "site-current", "Current project");
		getProjectNavigationRuntimeForSiteMock.mockResolvedValue({
			flowModuleKey: FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION,
			productionConfig: null,
			siteName: "Current project",
		});

		render(
			<ProjectProvider userId="user-switcher">
				<DashboardProjectNavigation
					availableProjects={[
						{ id: "site-current", name: "Current project" },
						{ id: "site-next", name: "Next project" },
					]}
					organizationLanguage="en"
				/>
			</ProjectProvider>,
		);

		const trigger = await screen.findByRole("button", {
			name: "Switch project",
		});
		await user.click(trigger);

		expect(trigger.querySelector("svg:last-child")).toHaveClass("rotate-180");

		const nextProjectLink = await screen.findByRole("menuitem", {
			name: "Next project",
		});
		expect(nextProjectLink).toHaveAttribute(
			"href",
			"/dashboard/sites/site-next/timesheets",
		);

		await user.click(nextProjectLink);
		expect(window.sessionStorage.getItem("project:user-switcher")).toBe(
			JSON.stringify({ id: "site-next", name: "Next project" }),
		);
	});

	it("renders a static project label when only one project is available", async () => {
		mockPathname = "/dashboard/sites/site-only/dashboard";
		seedProject("user-single-project", "site-only", "Only project");
		getProjectNavigationRuntimeForSiteMock.mockResolvedValue({
			flowModuleKey: FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION,
			productionConfig: null,
			siteName: "Only project",
		});

		render(
			<ProjectProvider userId="user-single-project">
				<DashboardProjectNavigation
					availableProjects={[{ id: "site-only", name: "Only project" }]}
					organizationLanguage="en"
				/>
			</ProjectProvider>,
		);

		expect(await screen.findByText("Only project")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Switch project" })).toBeNull();
	});

	it("shows descriptive tooltips for project module buttons", async () => {
		const user = userEvent.setup();
		mockPathname = "/dashboard/sites/site-tooltip/dashboard";
		seedProject("user-tooltip", "site-tooltip", "Tooltip project");
		getProjectNavigationRuntimeForSiteMock.mockResolvedValue({
			flowModuleKey: FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION,
			productionConfig: null,
			siteName: "Tooltip project",
		});

		render(
			<ProjectProvider userId="user-tooltip">
				<DashboardProjectNavigation
					availableProjects={[{ id: "site-tooltip", name: "Tooltip project" }]}
					organizationLanguage="en"
				/>
			</ProjectProvider>,
		);

		await user.hover(
			await screen.findByRole("link", { name: "Construction journal" }),
		);

		expect(
			await screen.findByText(
				"Review, add, and manage daily construction journal records for this project.",
			),
		).toBeInTheDocument();
	});

	it("applies dark-mode classes to project module button states", async () => {
		mockPathname = "/dashboard/sites/site-dark/timesheets";
		seedProject("user-dark", "site-dark", "Dark mode project");
		getProjectNavigationRuntimeForSiteMock.mockResolvedValue({
			flowModuleKey: FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION,
			productionConfig: null,
			siteName: "Dark mode project",
		});

		render(
			<ProjectProvider userId="user-dark">
				<DashboardProjectNavigation organizationLanguage="en" />
			</ProjectProvider>,
		);

		expect(
			await screen.findByRole("link", { name: "Construction journal" }),
		).toHaveClass(
			"dark:bg-transparent",
			"dark:border-slate-600",
			"dark:hover:bg-transparent",
		);
		expect(screen.getByRole("link", { name: "Timesheets" })).toHaveClass(
			"dark:bg-emerald-500/12",
			"dark:text-emerald-300",
		);
	});
});

function seedProject(userId: string, id: string, name: string) {
	window.sessionStorage.setItem(
		`project:${userId}`,
		JSON.stringify({ id, name }),
	);
}
