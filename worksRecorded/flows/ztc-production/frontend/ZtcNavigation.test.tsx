import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { DashboardSettingsLink } from "@/components/dashboard/DashboardSettingsLink";
import { FimaProjectNavigationLink } from "@/components/fima/FimaProjectNavigationLink";
import { ProjectProvider } from "@/components/providers/ProjectProvider";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { useZtcWorkspaceData } from "./useZtcWorkspaceData";
import { ZtcNavigationProvider, ZtcNavigationViewport } from "./ZtcNavigation";
import { ZtcProjectChooser } from "./ZtcProjectChooser";

const mockRefresh = jest.fn();
const mockPrefetch = jest.fn();
const mockRouter = { refresh: mockRefresh, prefetch: mockPrefetch };
const mockLoad = jest.fn();
const mockFetch = jest.fn();
const mockStorage = new Map();

jest.mock("next/navigation", () => ({
	usePathname: () => {
		const React = require("react");
		return React.useSyncExternalStore(
			(listener: () => void) => {
				window.addEventListener("popstate", listener);
				return () => window.removeEventListener("popstate", listener);
			},
			() => window.location.pathname,
			() => "/dashboard",
		);
	},
	useRouter: () => mockRouter,
}));
jest.mock("next/link", () => ({
	__esModule: true,
	default: ({
		href,
		onClick,
		onNavigate,
		prefetch: _prefetch,
		...props
	}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
		href: string;
		prefetch?: boolean;
		onNavigate?: (event: { preventDefault: () => void }) => void;
	}) => (
		<a
			{...props}
			href={href}
			onClick={(event) => {
				onClick?.(event);
				if (
					event.defaultPrevented ||
					event.ctrlKey ||
					event.metaKey ||
					event.shiftKey ||
					event.altKey ||
					event.button !== 0
				)
					return;
				onNavigate?.({ preventDefault: () => event.preventDefault() });
				event.preventDefault();
			}}
		/>
	),
}));
jest.mock("next/image", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/joyride/TourRunner", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("@/components/providers/ProjectLoadingProgressProvider", () => ({
	useProjectCacheScope: () => "user:org",
}));
jest.mock("@/flows/ztc-production/backend/actions", () => ({
	syncZtcWorkspace: (...args: unknown[]) => mockLoad(...args),
	getZtcWorkspaceActivity: jest.fn(),
}));
jest.mock("@/server/actions/site-diary-actions", () => ({
	getSiteDiaryMediaOnlyDays: async () => [],
}));
jest.mock("@/flows/ztc-production/lib/ztc-persistent-cache", () => ({
	ZtcPersistentCache: class {
		constructor(
			private scope: string,
			private id: string,
		) {}
		read = async () => mockStorage.get(`${this.scope}:${this.id}`) ?? null;
		write = async (data: unknown) => {
			mockStorage.set(`${this.scope}:${this.id}`, data);
		};
		clear = async () => {
			mockStorage.delete(`${this.scope}:${this.id}`);
		};
	},
}));
jest.mock("next/dynamic", () => ({
	__esModule: true,
	default: (loader: () => Promise<unknown>) =>
		loader.toString().includes("ZtcProjectChooser")
			? function MockChooser(
					props: React.ComponentProps<typeof ZtcProjectChooser>,
				) {
					return <ZtcProjectChooser {...props} />;
				}
			: MockProject,
}));

function MockProject({ siteId }: { siteId: string }) {
	const workspace = useZtcWorkspaceData(siteId, true);
	const [filter, setFilter] = useState("");
	const [draft, setDraft] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);
	return (
		<div>
			<h2>{siteId}</h2>
			<input
				aria-label="filter"
				value={filter}
				onChange={(event) => setFilter(event.target.value)}
			/>
			<input
				aria-label="draft"
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
			/>
			<output>{workspace.data?.rows[0]?.Works ?? "Loading diary"}</output>
			<button type="button" onClick={() => setDialogOpen(true)}>
				Edit rate
			</button>
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogTitle>Rate draft</DialogTitle>
					<DialogDescription>Unsaved rate</DialogDescription>
					<input
						aria-label="Dialog draft"
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
}

const projects = ["a", "b"].map((id) => ({
	id,
	name: `Project ${id}`,
	description: null,
	imageUrl: null,
}));
const href = (id: string) => `/dashboard/sites/${id}/dashboard`;
function data(siteId: string, works = "Cached work") {
	return {
		siteId,
		rows: [{ id: "row", Works: works }],
		config: {},
		rates: [],
		projectOptions: [],
		mediaOnlyDays: [],
	};
}
function app(userId = "user", children: ReactNode = "Server route") {
	return (
		<ProjectProvider userId={userId}>
			<ZtcNavigationProvider
				enabled
				userId={userId}
				organizationId="org"
				projects={projects}
				language="en"
			>
				<DashboardSettingsLink href="/dashboard/sites">
					Choose project
				</DashboardSettingsLink>
				<FimaProjectNavigationLink href={href("a")}>
					Project menu
				</FimaProjectNavigationLink>
				<ZtcNavigationViewport>{children}</ZtcNavigationViewport>
			</ZtcNavigationProvider>
		</ProjectProvider>
	);
}
let restoreHistory: () => void;
beforeEach(() => {
	jest.clearAllMocks();
	mockLoad.mockReset().mockImplementation(() => new Promise(() => {}));
	mockFetch.mockReset().mockImplementation(() => new Promise(() => {}));
	mockStorage.clear();
	mockStorage.set("user:org:a", data("a"));
	mockStorage.set("user:org:b", data("b", "Other work"));
	window.history.replaceState(null, "", "/dashboard");
	const push = window.history.pushState.bind(window.history);
	const replace = window.history.replaceState.bind(window.history);
	window.history.pushState = (...args) => {
		push(...args);
		window.dispatchEvent(new PopStateEvent("popstate"));
	};
	window.history.replaceState = (...args) => {
		replace(...args);
		window.dispatchEvent(new PopStateEvent("popstate"));
	};
	restoreHistory = () => {
		window.history.pushState = push;
		window.history.replaceState = replace;
	};
	Object.defineProperty(window, "scrollTo", {
		configurable: true,
		value: jest.fn(),
	});
	global.fetch = mockFetch;
});
afterEach(async () => {
	await act(async () => {
		await Promise.resolve();
	});
	cleanup();
	restoreHistory();
});

it("returns instantly with cached rows, filters and drafts while the update request is pending", async () => {
	mockLoad.mockResolvedValueOnce({ status: "ok", data: data("a") });
	render(app());
	fireEvent.mouseEnter(screen.getByText("Choose project"));
	expect(mockPrefetch).not.toHaveBeenCalled();
	fireEvent.click(screen.getAllByText("Open Project")[0]);
	await screen.findByText("Cached work");
	fireEvent.change(screen.getByRole("textbox", { name: "filter" }), {
		target: { value: "Panel" },
	});
	fireEvent.change(screen.getByRole("textbox", { name: "draft" }), {
		target: { value: "Unsaved rate" },
	});
	fireEvent.click(screen.getByText("Choose project"));
	expect(window.location.pathname).toBe("/dashboard");
	expect(screen.getByText("Your Sites")).toBeVisible();
	let resolveUpdate: (value: unknown) => void = () => {};
	mockLoad.mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				resolveUpdate = resolve;
			}),
	);
	fireEvent.click(screen.getByText("Project menu"));
	expect(screen.getByRole("textbox", { name: "filter" })).toHaveValue("Panel");
	expect(screen.getByRole("textbox", { name: "draft" })).toHaveValue(
		"Unsaved rate",
	);
	expect(screen.getByText("Cached work")).toBeVisible();
	expect(screen.queryByText("Loading diary")).not.toBeInTheDocument();
	await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(2));
	await act(async () =>
		resolveUpdate({ status: "ok", data: data("a", "Updated work") }),
	);
	expect(await screen.findByText("Updated work")).toBeVisible();
	expect(screen.getByRole("textbox", { name: "draft" })).toHaveValue(
		"Unsaved rate",
	);
	expect(mockFetch).toHaveBeenCalledTimes(1);
});

it("reuses a pending background update across rapid project round trips", async () => {
	render(app());
	fireEvent.click(screen.getByText("Project menu"));
	await screen.findByText("Cached work");
	fireEvent.click(screen.getByText("Choose project"));
	fireEvent.click(screen.getByText("Project menu"));
	fireEvent.click(screen.getByText("Choose project"));
	fireEvent.click(screen.getByText("Project menu"));
	expect(screen.getByText("Cached work")).toBeVisible();
	expect(mockLoad).toHaveBeenCalledTimes(1);
});

it("keeps project state separate and restores it through browser history", async () => {
	render(app());
	fireEvent.click(screen.getByText("Project menu"));
	await screen.findByText("Cached work");
	fireEvent.change(screen.getByRole("textbox", { name: "filter" }), {
		target: { value: "A only" },
	});
	fireEvent.click(screen.getByText("Choose project"));
	fireEvent.click(screen.getAllByText("Open Project")[1]);
	await screen.findByText("Other work");
	expect(screen.getByRole("textbox", { name: "filter" })).toHaveValue("");
	fireEvent.change(screen.getByRole("textbox", { name: "filter" }), {
		target: { value: "B only" },
	});
	await act(async () => {
		window.history.back();
		await new Promise((resolve) => setTimeout(resolve, 20));
	});
	expect(screen.getByText("Your Sites")).toBeVisible();
	await act(async () => {
		window.history.back();
		await new Promise((resolve) => setTimeout(resolve, 20));
	});
	expect(screen.getByRole("textbox", { name: "filter" })).toHaveValue("A only");
	await act(async () => {
		window.history.forward();
		await new Promise((resolve) => setTimeout(resolve, 20));
	});
	expect(screen.getByText("Your Sites")).toBeVisible();
});

it("removes a revoked project when the background catalog check finishes", async () => {
	let resolveCatalog: (value: unknown) => void = () => {};
	mockFetch.mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				resolveCatalog = resolve;
			}),
	);
	render(app());
	fireEvent.click(screen.getByText("Project menu"));
	await screen.findByText("Cached work");
	await act(async () =>
		resolveCatalog({
			ok: true,
			status: 200,
			json: async () => ({
				userId: "user",
				organizationId: "org",
				projects: [projects[1]],
			}),
		}),
	);
	expect(window.location.pathname).toBe("/dashboard");
	expect(screen.queryByText("Project a")).not.toBeInTheDocument();
	expect(screen.queryByText("Cached work")).not.toBeInTheDocument();
});

it("clears retained views after an account change and on access denial", async () => {
	const view = render(app());
	fireEvent.click(screen.getByText("Project menu"));
	await screen.findByText("Cached work");
	fireEvent.change(screen.getByRole("textbox", { name: "draft" }), {
		target: { value: "Private draft" },
	});
	mockFetch.mockResolvedValueOnce({ status: 403, ok: false });
	view.rerender(app("different-user"));
	await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
	expect(screen.queryByDisplayValue("Private draft")).not.toBeInTheDocument();
	expect(screen.queryByText("Cached work")).not.toBeInTheDocument();
	expect(screen.queryByText("Server route")).not.toBeInTheDocument();
});

it("keeps cached navigation usable when the catalog check fails offline", async () => {
	mockFetch.mockRejectedValueOnce(new Error("Offline"));
	render(app());
	fireEvent.click(screen.getByText("Project menu"));
	await screen.findByText("Cached work");
	fireEvent.click(screen.getByText("Choose project"));
	expect(screen.getByText("Your Sites")).toBeVisible();
	fireEvent.click(screen.getByText("Project menu"));
	expect(screen.getByText("Cached work")).toBeVisible();
	expect(mockRefresh).not.toHaveBeenCalled();
});

it("hides an open project dialog on Back and restores its draft on Forward", async () => {
	render(app());
	fireEvent.click(screen.getByText("Project menu"));
	await screen.findByText("Cached work");
	fireEvent.click(screen.getByText("Edit rate"));
	fireEvent.change(screen.getByRole("textbox", { name: "Dialog draft" }), {
		target: { value: "9.50" },
	});
	await act(async () => {
		window.history.back();
		await new Promise((resolve) => setTimeout(resolve, 20));
	});
	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	expect(screen.getByText("Your Sites")).toBeVisible();
	await act(async () => {
		window.history.forward();
		await new Promise((resolve) => setTimeout(resolve, 20));
	});
	expect(screen.getByRole("dialog", { name: "Rate draft" })).toBeVisible();
	expect(screen.getByRole("textbox", { name: "Dialog draft" })).toHaveValue(
		"9.50",
	);
});
