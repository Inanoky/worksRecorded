import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import {
	AppRouterContext,
	type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { type ReactNode, useEffect, useState } from "react";
import { loadFlowConfigs } from "@/app/dashboard/admin/flow-configs/load-settings";
import { loadOrganizationSettings } from "@/app/dashboard/settings/load-settings";
import { useRefreshSettings } from "@/components/settings/SettingsRefreshContext";
import { DashboardSettingsLink } from "./DashboardSettingsLink";
import {
	DashboardSettingsContent,
	DashboardSettingsProvider,
} from "./DashboardSettingsProvider";

jest.mock("next/link", () =>
	jest.requireActual("next/dist/client/app-dir/link"),
);
jest.mock("next/dist/client/components/links", () => ({
	IDLE_LINK_STATUS: { pending: false },
	mountLinkInstance: jest.fn(() => null),
	unmountPrefetchableInstance: jest.fn(),
	onNavigationIntent: jest.fn(),
}));

jest.mock("@/app/dashboard/settings/load-settings", () => ({
	loadOrganizationSettings: jest.fn(),
}));
jest.mock("@/app/dashboard/admin/flow-configs/load-settings", () => ({
	loadFlowConfigs: jest.fn(),
}));
jest.mock("@/app/dashboard/settings/OrganizationSettingsView", () => ({
	OrganizationSettingsView: ({ data }: { data: { orgId: string } }) => {
		const refresh = useRefreshSettings();
		return (
			<div>
				<h1>Organization {data.orgId}</h1>
				<button type="button" onClick={refresh}>
					Save settings
				</button>
			</div>
		);
	},
}));
jest.mock("@/app/dashboard/admin/flow-configs/FlowConfigsView", () => ({
	FlowConfigsView: () => {
		const refresh = useRefreshSettings();
		return (
			<div>
				<h1>Flow assignments</h1>
				<button type="button" onClick={refresh}>
					Save flow
				</button>
			</div>
		);
	},
}));

const router: AppRouterInstance = {
	back: jest.fn(),
	forward: jest.fn(),
	push: jest.fn(),
	replace: jest.fn(),
	refresh: jest.fn(),
	prefetch: jest.fn(),
};

function RouterHarness({ children }: { children: ReactNode }) {
	const [pathname, setPathname] = useState(window.location.pathname);
	useEffect(() => {
		const update = () => setPathname(window.location.pathname);
		window.addEventListener("popstate", update);
		return () => window.removeEventListener("popstate", update);
	}, []);
	return (
		<AppRouterContext.Provider value={router}>
			<PathnameContext.Provider value={pathname}>
				{children}
			</PathnameContext.Provider>
		</AppRouterContext.Provider>
	);
}

function App({
	scope = "org-a",
	admin = true,
}: {
	scope?: string;
	admin?: boolean;
}) {
	return (
		<RouterHarness>
			<DashboardSettingsProvider
				key={scope}
				canAccessFlowConfigs={admin}
				organizationLanguage="en"
			>
				<DashboardSettingsLink href="/dashboard/settings">
					Organization settings
				</DashboardSettingsLink>
				<DashboardSettingsLink href="/dashboard/admin/flow-configs">
					Flow configs
				</DashboardSettingsLink>
				<DashboardSettingsLink href="/dashboard/settings" target="_blank">
					Open new tab
				</DashboardSettingsLink>
				<DashboardSettingsContent>
					<h1>Projects</h1>
				</DashboardSettingsContent>
			</DashboardSettingsProvider>
		</RouterHarness>
	);
}

beforeEach(() => {
	jest.clearAllMocks();
	window.history.replaceState(null, "", "/dashboard/sites");
	const pushState = window.history.pushState.bind(window.history);
	jest
		.spyOn(window.history, "pushState")
		.mockImplementation((data, unused, url) => {
			pushState(data, unused, url);
			window.dispatchEvent(new PopStateEvent("popstate"));
		});
	jest.spyOn(window, "scrollTo").mockImplementation(() => {});
	jest
		.mocked(loadOrganizationSettings)
		.mockResolvedValue({ orgId: "org-a" } as never);
	jest.mocked(loadFlowConfigs).mockResolvedValue({} as never);
});

afterEach(() => jest.restoreAllMocks());

it("opens the settings shell before the first data request completes", async () => {
	let resolve!: (
		value: Awaited<ReturnType<typeof loadOrganizationSettings>>,
	) => void;
	jest.mocked(loadOrganizationSettings).mockReturnValueOnce(
		new Promise((done) => {
			resolve = done;
		}),
	);
	render(<App />);
	fireEvent.click(screen.getByRole("link", { name: "Organization settings" }));
	expect(window.location.pathname).toBe("/dashboard/settings");
	expect(screen.getByRole("status")).toHaveTextContent("Loading settings");
	expect(
		screen.queryByRole("heading", { name: "Projects" }),
	).not.toBeInTheDocument();
	await act(async () => resolve({ orgId: "org-a" } as never));
	await screen.findByRole("heading", { name: "Organization org-a" });
});

it("preloads data on hover and navigates with the real Next Link without requesting a route", async () => {
	render(<App />);
	const link = screen.getByRole("link", { name: "Organization settings" });
	fireEvent.mouseEnter(link);
	await waitFor(() =>
		expect(loadOrganizationSettings).toHaveBeenCalledTimes(1),
	);
	expect(screen.getByRole("heading", { name: "Projects" })).toBeInTheDocument();
	fireEvent.click(link);
	expect(
		await screen.findByRole("heading", { name: "Organization org-a" }),
	).toBeInTheDocument();
	expect(window.location.pathname).toBe("/dashboard/settings");
	expect(router.push).not.toHaveBeenCalled();
	expect(router.prefetch).not.toHaveBeenCalled();
	expect(loadOrganizationSettings).toHaveBeenCalledTimes(1);
});

it("reuses each page when switching and handles back/forward history", async () => {
	render(<App />);
	fireEvent.click(screen.getByRole("link", { name: "Organization settings" }));
	await screen.findByRole("heading", { name: "Organization org-a" });
	fireEvent.click(screen.getByRole("link", { name: "Flow configs" }));
	await screen.findByRole("heading", { name: "Flow assignments" });
	act(() => window.history.back());
	await screen.findByRole("heading", { name: "Organization org-a" });
	act(() => window.history.back());
	await screen.findByRole("heading", { name: "Projects" });
	act(() => window.history.forward());
	await screen.findByRole("heading", { name: "Organization org-a" });
	expect(loadOrganizationSettings).toHaveBeenCalledTimes(1);
	expect(loadFlowConfigs).toHaveBeenCalledTimes(1);
});

it("renders a directly opened settings URL and refreshes data after a save", async () => {
	window.history.replaceState(null, "", "/dashboard/settings");
	render(<App />);
	await screen.findByRole("heading", { name: "Organization org-a" });
	jest
		.mocked(loadOrganizationSettings)
		.mockResolvedValueOnce({ orgId: "updated" } as never);
	fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
	await screen.findByRole("heading", { name: "Organization updated" });
	expect(loadOrganizationSettings).toHaveBeenCalledTimes(2);
	expect(router.refresh).not.toHaveBeenCalled();
});

it("invalidates organization settings after changing flow configuration", async () => {
	render(<App />);
	fireEvent.click(screen.getByRole("link", { name: "Organization settings" }));
	await screen.findByRole("heading", { name: "Organization org-a" });
	fireEvent.click(screen.getByRole("link", { name: "Flow configs" }));
	await screen.findByRole("heading", { name: "Flow assignments" });
	fireEvent.click(screen.getByRole("button", { name: "Save flow" }));
	await waitFor(() => expect(loadFlowConfigs).toHaveBeenCalledTimes(2));
	jest
		.mocked(loadOrganizationSettings)
		.mockResolvedValueOnce({ orgId: "changed-flow" } as never);
	fireEvent.click(screen.getByRole("link", { name: "Organization settings" }));
	await screen.findByRole("heading", { name: "Organization changed-flow" });
	expect(loadOrganizationSettings).toHaveBeenCalledTimes(2);
});

it("starts with an empty cache after the signed-in user's organization changes", async () => {
	window.history.replaceState(null, "", "/dashboard/settings");
	const { rerender } = render(<App />);
	await screen.findByRole("heading", { name: "Organization org-a" });
	jest
		.mocked(loadOrganizationSettings)
		.mockResolvedValueOnce({ orgId: "org-b" } as never);
	rerender(<App scope="org-b" />);
	expect(
		screen.queryByRole("heading", { name: "Organization org-a" }),
	).not.toBeInTheDocument();
	await screen.findByRole("heading", { name: "Organization org-b" });
	expect(loadOrganizationSettings).toHaveBeenCalledTimes(2);
});

it("does not preload or render admin data for an unauthorized viewer", async () => {
	render(<App admin={false} />);
	const link = screen.getByRole("link", { name: "Flow configs" });
	fireEvent.mouseEnter(link);
	fireEvent.click(link);
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Page not available",
	);
	expect(loadFlowConfigs).not.toHaveBeenCalled();
});

it("shows a retry after a failed load", async () => {
	jest
		.mocked(loadOrganizationSettings)
		.mockRejectedValueOnce(new Error("offline"));
	window.history.replaceState(null, "", "/dashboard/settings");
	render(<App />);
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Could not load settings",
	);
	fireEvent.click(screen.getByRole("button", { name: "Try again" }));
	await screen.findByRole("heading", { name: "Organization org-a" });
});

it("leaves modified clicks and new-tab links to the browser", () => {
	render(<App />);
	const preventNavigation = jest.fn((event: MouseEvent) => {
		expect(event.defaultPrevented).toBe(false);
		event.preventDefault();
	});
	document.addEventListener("click", preventNavigation);
	fireEvent.click(screen.getByRole("link", { name: "Organization settings" }), {
		ctrlKey: true,
	});
	fireEvent.click(screen.getByRole("link", { name: "Open new tab" }));
	expect(window.history.pushState).not.toHaveBeenCalled();
	expect(window.location.pathname).toBe("/dashboard/sites");
	expect(loadOrganizationSettings).not.toHaveBeenCalled();
	expect(preventNavigation).toHaveBeenCalledTimes(2);
	document.removeEventListener("click", preventNavigation);
});
