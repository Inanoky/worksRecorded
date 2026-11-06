import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import OpenProjectButton from "@/components/providers/ButtonClient";
import {
	ProjectProvider,
	useProject,
} from "@/components/providers/ProjectProvider";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const mockRefresh = jest.fn();
const mockReplace = jest.fn();
const mockLoad = jest.fn();
const mockDispose = jest.fn();
jest.mock("next/link", () => ({
	__esModule: true,
	default: ({
		href,
		children,
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
					event.altKey
				)
					return;
				onNavigate?.({ preventDefault: () => event.preventDefault() });
				event.preventDefault();
			}}
		>
			{children}
		</a>
	),
}));
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
	useSearchParams: () => new URLSearchParams(window.location.search),
	useRouter: () => ({ refresh: mockRefresh, replace: mockReplace }),
}));
jest.mock("@/components/fima/FimaProjectProvider", () => ({
	FimaProjectContent: ({ children }: { children: ReactNode }) => children,
}));
jest.mock("@/flows/default-construction/frontend/LimeniProjectData", () => ({
	LimeniProjectData: ({ children }: { children: ReactNode }) => children,
}));
jest.mock("@/flows/default-construction/frontend/RetainedLimeniDiary", () => ({
	RetainedLimeniDiary: ({ children }: { children: ReactNode }) => children,
}));
jest.mock("@/flows/default-construction/frontend/RetainedLimeniForma2", () => ({
	RetainedLimeniForma2: () => null,
}));
jest.mock("@/flows/default-construction/visual/VisualProjectView", () => ({
	VisualProjectView: ({ children }: { children: ReactNode }) => children,
}));

import { RegisterWorkspaceRoot } from "./ProjectRegistration";
import {
	ProjectWorkspaceProvider,
	ProjectWorkspaceViewport,
	RegisterProjectPage,
	RegisterProjectWorkspace,
} from "./ProjectWorkspaces";
import { useWorkspaceActive } from "./WorkspaceActivity";
import { useWorkspaceNavigation } from "./WorkspaceNavigation";
import type { WorkspaceDescriptor } from "./workspace-store";

const descriptors = new Map<string, WorkspaceDescriptor>();
const href = (id: string, view = "dashboard") =>
	`/dashboard/sites/${id}/${view}`;
function descriptor(id: string) {
	if (!descriptors.has(id))
		descriptors.set(id, {
			siteId: id,
			userId: "user",
			organizationId: "org",
			name: id,
			flowModuleKey: "default-construction",
		});
	const value = descriptors.get(id);
	if (!value) throw new Error("Missing test project");
	return value;
}
function StatefulScreen({ id }: { id: string }) {
	const [text, setText] = useState("");
	const [page, setPage] = useState(1);
	const [open, setOpen] = useState(false);
	const active = useWorkspaceActive();
	const project = useProject();
	useEffect(() => {
		mockLoad(id);
		return () => {
			mockDispose(id);
		};
	}, [id]);
	return (
		<div>
			<output>{`${id}:project=${project.projectId}:active=${active}`}</output>
			<form>
				<input
					aria-label={`edit-${id}`}
					value={text}
					onChange={(event) => setText(event.target.value)}
				/>
			</form>
			<button
				type="button"
				onClick={() => setPage((value) => value + 1)}
			>{`${id}:page=${page}`}</button>
			<button
				type="button"
				onClick={() => setOpen(true)}
			>{`dialog-${id}`}</button>
			<div data-scroll={id} style={{ overflow: "auto", height: 50 }}>
				<div style={{ height: 500 }}>scroll</div>
			</div>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogTitle>{`draft-${id}`}</DialogTitle>
					<ModalDraft id={id} />
				</DialogContent>
			</Dialog>
		</div>
	);
}
function ModalDraft({ id }: { id: string }) {
	const [text, setText] = useState("");
	return (
		<input
			aria-label={`modal-${id}`}
			value={text}
			onChange={(event) => setText(event.target.value)}
		/>
	);
}
function Navigation() {
	const navigation = useWorkspaceNavigation();
	return (
		<>
			<OpenProjectButton projectId="a" projectName="a" label="Open cached a" />
			{["a", "b"].map((id) => (
				<button
					key={id}
					type="button"
					onClick={() => navigation?.navigate(href(id))}
				>{`back-${id}`}</button>
			))}
		</>
	);
}
function ServerContent({ id }: { id: string }) {
	const content = useMemo(() => <StatefulScreen id={id} />, [id]);
	return (
		<RegisterProjectWorkspace descriptor={descriptor(id)}>
			<RegisterProjectPage siteId={id} href={href(id)}>
				{content}
			</RegisterProjectPage>
		</RegisterProjectWorkspace>
	);
}
function App({
	serverId,
	userId = "user",
}: {
	serverId: string;
	userId?: string;
}) {
	return (
		<ProjectProvider userId={userId}>
			<ProjectWorkspaceProvider userId={userId} organizationId="org">
				<Navigation />
				<ProjectWorkspaceViewport>
					<ServerContent id={serverId} />
				</ProjectWorkspaceViewport>
			</ProjectWorkspaceProvider>
		</ProjectProvider>
	);
}
function changeUrl(url: string) {
	window.history.replaceState(null, "", url);
	window.dispatchEvent(new PopStateEvent("popstate"));
}
let push: typeof window.history.pushState;
beforeEach(() => {
	jest.clearAllMocks();
	window.scrollTo = jest.fn();
	window.history.replaceState(null, "", href("a"));
	push = window.history.pushState.bind(window.history);
	jest
		.spyOn(window.history, "pushState")
		.mockImplementation((data, unused, url) => {
			push(data, unused, url);
			window.dispatchEvent(new PopStateEvent("popstate"));
		});
});
afterEach(() => jest.restoreAllMocks());

it("switches back without mounting or loading again and preserves edits, pagination and the project scope", () => {
	const app = render(<App serverId="a" />);
	fireEvent.change(screen.getByLabelText("edit-a"), {
		target: { value: "unsaved quantity" },
	});
	fireEvent.click(screen.getByText("a:page=1"));
	act(() => changeUrl(href("b")));
	app.rerender(<App serverId="b" />);
	expect(screen.getByText("b:project=b:active=true")).toBeVisible();
	fireEvent.click(screen.getByText("back-a"));
	expect(screen.getByLabelText("edit-a")).toHaveValue("unsaved quantity");
	expect(screen.getByText("a:page=2")).toBeVisible();
	expect(screen.getByText("a:project=a:active=true")).toBeVisible();
	expect(screen.getByText("b:project=b:active=false")).not.toBeVisible();
	expect(mockLoad.mock.calls.filter(([id]) => id === "a")).toHaveLength(1);
	expect(mockDispose).not.toHaveBeenCalled();
	expect(mockRefresh).not.toHaveBeenCalled();
});

it("reopens a cached project from its project-list button without a loading overlay or progress reset", () => {
	const app = render(<App serverId="a" />);
	fireEvent.change(screen.getByLabelText("edit-a"), {
		target: { value: "keep this edit" },
	});
	act(() => changeUrl(href("b")));
	app.rerender(<App serverId="b" />);
	fireEvent.click(screen.getByRole("link", { name: "Open cached a" }));
	expect(window.location.pathname).toBe(href("a"));
	expect(screen.getByLabelText("edit-a")).toHaveValue("keep this edit");
	expect(
		screen.getByRole("link", { name: "Open cached a" }),
	).not.toHaveAttribute("aria-disabled", "true");
	expect(screen.queryByText("Opening project...")).toBeNull();
	expect(mockLoad.mock.calls.filter(([id]) => id === "a")).toHaveLength(1);
});
it("preserves a portal form while releasing its modal focus effects in an inactive workspace", async () => {
	const app = render(<App serverId="a" />);
	fireEvent.click(screen.getByText("dialog-a"));
	fireEvent.change(screen.getByLabelText("modal-a"), {
		target: { value: "draft comment" },
	});
	act(() => changeUrl(href("b")));
	app.rerender(<App serverId="b" />);
	expect(screen.queryByRole("dialog", { name: "draft-a" })).toBeNull();
	expect(screen.getByText("b:project=b:active=true")).toBeVisible();
	fireEvent.click(screen.getByText("back-a"));
	expect(await screen.findByRole("dialog", { name: "draft-a" })).toBeVisible();
	expect(screen.getByLabelText("modal-a")).toHaveValue("draft comment");
});
it("retains five projects and keeps the dirty project when a sixth opens", () => {
	const app = render(<App serverId="a" />);
	fireEvent.change(screen.getByLabelText("edit-a"), {
		target: { value: "local edit" },
	});
	for (const id of ["b", "c", "d", "e", "f"]) {
		act(() => changeUrl(href(id)));
		app.rerender(<App serverId={id} />);
	}
	expect(document.querySelectorAll("[data-project-workspace]")).toHaveLength(5);
	expect(mockDispose).toHaveBeenCalledWith("b");
	fireEvent.click(screen.getByText("back-a"));
	expect(screen.getByLabelText("edit-a")).toHaveValue("local edit");
	expect(mockDispose).not.toHaveBeenCalledWith("a");
});
it("removes retained screens when the authenticated identity changes", () => {
	const app = render(<App serverId="a" />);
	fireEvent.change(screen.getByLabelText("edit-a"), {
		target: { value: "private" },
	});
	app.rerender(<App serverId="a" userId="another-user" />);
	expect(screen.queryByLabelText("edit-a")).toBeNull();
	expect(document.querySelectorAll("[data-project-workspace]")).toHaveLength(0);
});

it("restores scroll positions when returning to a retained project", async () => {
	const app = render(<App serverId="a" />);
	const scroller = document.querySelector('[data-scroll="a"]');
	if (!scroller) throw new Error("Missing scroll container");
	scroller.scrollTop = 175;
	scroller.scrollLeft = 40;
	fireEvent.scroll(scroller);
	act(() => changeUrl(href("b")));
	app.rerender(<App serverId="b" />);
	scroller.scrollTop = 0;
	scroller.scrollLeft = 0;
	fireEvent.click(screen.getByText("back-a"));
	await waitFor(() => expect(scroller.scrollTop).toBe(175));
	expect(scroller.scrollLeft).toBe(40);
});

it("checks revoked access in the background without trusting another identity", async () => {
	const app = render(<App serverId="a" />);
	act(() => changeUrl(href("b")));
	app.rerender(<App serverId="b" />);
	const now = Date.now();
	jest.spyOn(Date, "now").mockReturnValue(now + 61000);
	const request = jest.fn().mockResolvedValue({ status: 403, ok: false });
	const previous = global.fetch;
	global.fetch = request;
	fireEvent.click(screen.getByText("back-a"));
	expect(screen.getByText("a:project=a:active=true")).toBeVisible();
	await waitFor(() =>
		expect(mockReplace).toHaveBeenCalledWith("/dashboard/sites"),
	);
	expect(screen.queryByLabelText("edit-a")).toBeNull();
	expect(request).toHaveBeenCalledWith("/api/sites/a/workspace-access", {
		cache: "no-store",
	});
	global.fetch = previous;
});

it.each(["/dashboard", "/dashboard/fima"])(
	"retains root %s filters and project drafts without a route reload",
	(root) => {
		const rootScreenId = "root";
		const projectScreenId = "a";
		function RootApp({ serverProject = false }: { serverProject?: boolean }) {
			const content = useMemo(() => <StatefulScreen id={rootScreenId} />, []);
			return (
				<ProjectProvider userId="user">
					<ProjectWorkspaceProvider userId="user" organizationId="org">
						<Navigation />
						<RootNavigation />
						<ProjectWorkspaceViewport>
							{serverProject ? (
								<ServerContent id={projectScreenId} />
							) : (
								<RegisterWorkspaceRoot href={root}>
									{content}
								</RegisterWorkspaceRoot>
							)}
						</ProjectWorkspaceViewport>
					</ProjectWorkspaceProvider>
				</ProjectProvider>
			);
		}
		function RootNavigation() {
			const navigation = useWorkspaceNavigation();
			return (
				<button
					type="button"
					onClick={() => navigation?.navigate("/dashboard/sites")}
				>
					Choose project
				</button>
			);
		}
		act(() => changeUrl(root));
		const app = render(<RootApp />);
		fireEvent.change(screen.getByLabelText("edit-root"), {
			target: { value: "saved filter" },
		});
		act(() => changeUrl(href("a")));
		app.rerender(<RootApp serverProject />);
		fireEvent.change(screen.getByLabelText("edit-a"), {
			target: { value: "project draft" },
		});
		fireEvent.click(screen.getByText("Choose project"));
		expect(window.location.pathname).toBe(root);
		expect(screen.getByLabelText("edit-root")).toHaveValue("saved filter");
		fireEvent.click(screen.getByText("back-a"));
		expect(screen.getByLabelText("edit-a")).toHaveValue("project draft");
		expect(mockLoad.mock.calls.filter(([id]) => id === "root")).toHaveLength(1);
		expect(mockRefresh).not.toHaveBeenCalled();
	},
);
