import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { WorkspaceActivityContext } from "@/components/projects/WorkspaceActivity";
import { ProjectLoadingProgressProvider } from "@/components/providers/ProjectLoadingProgressProvider";
import {
	clearPersistentProjects,
	PersistentProjectCache,
} from "../visual/project-persistent-cache";
import { patchProject } from "../visual/project-sync";
import { VisualProjectView } from "../visual/VisualProjectView";
import { Context as DiarySaveContext, getEmpty } from "./DiarySaveContext";
import { LimeniProjectData, useLimeniProjectData } from "./LimeniProjectData";
import {
	RegisterLimeniDiary,
	RetainedLimeniDiary,
} from "./RetainedLimeniDiary";

jest.mock("next/navigation", () => ({
	usePathname: () => "/dashboard/sites/site/dashboard",
}));
jest.mock("@/components/sitediary/SiteDiaryList", () => ({
	__esModule: true,
	default: () => <output>Diary mounted</output>,
}));
jest.mock("../visual/VisualView", () => ({
	__esModule: true,
	default: () => <div>Plans ready</div>,
}));
const mockRead = jest.fn();
const mockWrite = jest.fn();
jest.mock("../visual/project-persistent-cache", () => ({
	PersistentProjectCache: jest
		.fn()
		.mockImplementation(() => ({ read: mockRead, write: mockWrite })),
	clearPersistentProjects: jest.fn().mockResolvedValue(undefined),
	switchPersistentIdentity: jest.fn().mockResolvedValue(undefined),
}));
const originalFetch = global.fetch;
const project = (version: string) => ({
	settings: { siteId: "site" },
	version,
	diary: { rows: [] },
});
function Consumer() {
	const data = useLimeniProjectData();
	return (
		<>
			<output>{data.snapshot?.version ?? "waiting"}</output>
			<input aria-label="Draft" defaultValue="" />
		</>
	);
}
function Workspace({ enabled = true }: { enabled?: boolean }) {
	return (
		<ProjectLoadingProgressProvider
			enabled
			visualPreloadEnabled={enabled}
			cacheScope="user:organization"
		>
			<LimeniProjectData siteId="site">
				<Consumer />
			</LimeniProjectData>
		</ProjectLoadingProgressProvider>
	);
}
beforeEach(() => {
	jest.clearAllMocks();
	mockRead.mockResolvedValue(undefined);
	global.fetch = jest.fn();
});
afterAll(() => {
	global.fetch = originalFetch;
});

it("loads one project snapshot and persists it under the authenticated scope", async () => {
	jest.mocked(global.fetch).mockResolvedValue({
		ok: true,
		json: async () => project("fresh"),
	} as Response);
	render(<Workspace />);
	expect(await screen.findByText("fresh")).toBeInTheDocument();
	expect(PersistentProjectCache).toHaveBeenCalledWith(
		"user:organization",
		"site",
	);
	expect(global.fetch).toHaveBeenCalledTimes(1);
	expect(mockWrite).toHaveBeenCalledWith("snapshot", project("fresh"));
});
it("restores standard construction projects without enabling the visual preload or downloading drawings", async () => {
	mockRead.mockResolvedValue(project("cached-construction"));
	jest.mocked(global.fetch).mockResolvedValue({ status: 304 } as Response);
	render(
		<ProjectLoadingProgressProvider enabled cacheScope="user:organization">
			<LimeniProjectData siteId="site" constructionWorkspace>
				<Consumer />
			</LimeniProjectData>
		</ProjectLoadingProgressProvider>,
	);
	expect(await screen.findByText("cached-construction")).toBeInTheDocument();
	expect(mockRead).toHaveBeenCalledWith("construction:snapshot");
	expect(global.fetch).toHaveBeenCalledWith(
		"/api/sites/site/construction-project",
		expect.objectContaining({
			headers: { "If-None-Match": '"cached-construction"' },
		}),
	);
});

it("shows the saved project immediately and revalidates without resetting an edited draft", async () => {
	mockRead.mockResolvedValue(project("cached"));
	let finish!: (response: Response) => void;
	jest.mocked(global.fetch).mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	render(<Workspace />);
	expect(await screen.findByText("cached")).toBeInTheDocument();
	fireEvent.input(screen.getByLabelText("Draft"), {
		target: { value: "unsaved" },
	});
	await act(async () =>
		finish({ ok: true, json: async () => project("updated") } as Response),
	);
	expect(screen.getByLabelText("Draft")).toHaveValue("unsaved");
	expect(screen.getByText("cached")).toBeInTheDocument();
	expect(mockWrite).not.toHaveBeenCalled();
	expect(global.fetch).toHaveBeenCalledWith(
		expect.any(String),
		expect.objectContaining({ headers: { "If-None-Match": '"cached"' } }),
	);
});

it("removes cached project data and unmounts the workspace when access is revoked", async () => {
	mockRead.mockResolvedValue(project("cached"));
	jest.mocked(global.fetch).mockResolvedValue({ status: 403 } as Response);
	render(<Workspace />);
	expect(await screen.findByRole("alert")).toHaveTextContent("piekļuve");
	expect(clearPersistentProjects).toHaveBeenCalledTimes(1);
	expect(screen.queryByLabelText("Draft")).not.toBeInTheDocument();
});

it("keeps a cached project usable during a temporary server failure", async () => {
	mockRead.mockResolvedValue(project("cached"));
	jest
		.mocked(global.fetch)
		.mockResolvedValue({ ok: false, status: 503 } as Response);
	render(<Workspace />);
	expect(await screen.findByText("cached")).toBeInTheDocument();
	await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
	expect(clearPersistentProjects).not.toHaveBeenCalled();
});

it("leaves other organizations on their existing loading path", () => {
	render(<Workspace enabled={false} />);
	expect(global.fetch).not.toHaveBeenCalled();
	expect(mockRead).not.toHaveBeenCalled();
});

it("waits for the shared snapshot even when the server page registers diary settings first", async () => {
	let finish!: (response: Response) => void;
	jest.mocked(global.fetch).mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	render(
		<ProjectLoadingProgressProvider
			enabled
			visualPreloadEnabled
			cacheScope="user:organization"
		>
			<LimeniProjectData siteId="site">
				<RetainedLimeniDiary siteId="site">
					<RegisterLimeniDiary
						siteId="site"
						userId="user"
						organizationId="organization"
						bisEnabled={false}
						organizationLanguage="lv"
					/>
				</RetainedLimeniDiary>
			</LimeniProjectData>
		</ProjectLoadingProgressProvider>,
	);
	await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
	expect(screen.queryByText("Diary mounted")).not.toBeInTheDocument();
	await act(async () =>
		finish({ ok: true, json: async () => project("fresh") } as Response),
	);
	expect(await screen.findByText("Diary mounted")).toBeInTheDocument();
});

it("reopens from disk without a project loading gate while the background check is still pending", async () => {
	mockRead.mockResolvedValue(project("cached"));
	jest.mocked(global.fetch).mockImplementation(() => new Promise(() => {}));
	const workspace = () => (
		<ProjectLoadingProgressProvider
			enabled
			visualPreloadEnabled
			cacheScope="user:organization"
		>
			<LimeniProjectData siteId="site">
				<VisualProjectView siteId="site">
					<Consumer />
				</VisualProjectView>
			</LimeniProjectData>
		</ProjectLoadingProgressProvider>
	);
	const first = render(workspace());
	await screen.findByText("cached");
	expect(screen.queryByLabelText("Sagatavo projektu…")).not.toBeInTheDocument();
	first.unmount();
	render(workspace());
	await screen.findByText("cached");
	expect(screen.queryByLabelText("Sagatavo projektu…")).not.toBeInTheDocument();
	expect(global.fetch).toHaveBeenCalledTimes(2);
});
it("keeps the local project for an unchanged revision without parsing a response body", async () => {
	mockRead.mockResolvedValue({
		...project("cached"),
		revision: "r1",
		partVersions: { diary: "a".repeat(64) },
	});
	const json = jest.fn();
	jest
		.mocked(global.fetch)
		.mockResolvedValue({ status: 304, json } as unknown as Response);
	render(<Workspace />);
	await screen.findByText("cached");
	await waitFor(() => expect(global.fetch).toHaveBeenCalled());
	expect(json).not.toHaveBeenCalled();
	expect(mockWrite).not.toHaveBeenCalled();
	expect(global.fetch).toHaveBeenCalledWith(
		expect.any(String),
		expect.objectContaining({
			headers: {
				"If-None-Match": '"r1"',
				"X-Project-Parts": JSON.stringify({ diary: "a".repeat(64) }),
			},
		}),
	);
});
it("writes a confirmed local update before leaving so the next visit restores it", async () => {
	mockRead.mockResolvedValue(project("cached"));
	jest.mocked(global.fetch).mockImplementation(() => new Promise(() => {}));
	const first = render(<Workspace />);
	await screen.findByText("cached");
	act(() =>
		patchProject("site", (snapshot) => ({
			...snapshot,
			version: "saved-locally",
		})),
	);
	expect(mockWrite).toHaveBeenLastCalledWith(
		"snapshot",
		project("saved-locally"),
	);
	expect(screen.getByText("saved-locally")).toBeInTheDocument();
	mockRead.mockResolvedValue(project("saved-locally"));
	first.unmount();
	render(<Workspace />);
	expect(await screen.findByText("saved-locally")).toBeInTheDocument();
});

it("does not let a hidden always-mounted dialog block background synchronization", async () => {
	mockRead.mockResolvedValue(project("cached"));
	jest.mocked(global.fetch).mockResolvedValue({
		ok: true,
		json: async () => project("updated"),
	} as Response);
	render(
		<>
			<div hidden>
				<div role="dialog">Hidden contact form</div>
			</div>
			<Workspace />
		</>,
	);
	expect(await screen.findByText("updated")).toBeInTheDocument();
	expect(mockWrite).toHaveBeenLastCalledWith("snapshot", project("updated"));
});

it("retains a deferred background update across workspace switches and publishes it after the editor closes", async () => {
	mockRead.mockResolvedValue(project("cached"));
	jest
		.mocked(global.fetch)
		.mockResolvedValueOnce({
			ok: true,
			json: async () => project("updated"),
		} as Response)
		.mockResolvedValue({ status: 304 } as Response);
	const protect = jest.fn();
	const workspace = (active: boolean, editing: boolean) => (
		<WorkspaceActivityContext.Provider
			value={{ active, protect, managed: true }}
		>
			{editing && <div role="dialog">Editor</div>}
			<Workspace />
		</WorkspaceActivityContext.Provider>
	);
	const view = render(workspace(true, true));
	await screen.findByText("cached");
	await waitFor(() =>
		expect(mockWrite).toHaveBeenCalledWith("snapshot", project("updated")),
	);
	expect(screen.queryByText("updated")).not.toBeInTheDocument();
	view.rerender(workspace(false, true));
	view.rerender(workspace(true, true));
	await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
	expect(screen.getByText("cached")).toBeInTheDocument();
	view.rerender(workspace(true, false));
	fireEvent.focus(window);
	expect(await screen.findByText("updated")).toBeInTheDocument();
	expect(mockRead).toHaveBeenCalledTimes(1);
});

it("keeps confirmed local changes visible while a remote update is deferred", async () => {
	mockRead.mockResolvedValue(project("cached"));
	jest.mocked(global.fetch).mockResolvedValue({
		ok: true,
		json: async () => project("remote"),
	} as Response);
	render(
		<>
			<div role="dialog">Editor</div>
			<Workspace />
		</>,
	);
	await screen.findByText("cached");
	await waitFor(() =>
		expect(mockWrite).toHaveBeenCalledWith("snapshot", project("remote")),
	);
	act(() => patchProject("site", (value) => ({ ...value, version: "local" })));
	expect(screen.getByText("local")).toBeInTheDocument();
	expect(mockWrite).toHaveBeenLastCalledWith("snapshot", project("local"));
});

it("recovers an incomplete cached delta with a full authenticated snapshot in the background", async () => {
	mockRead.mockResolvedValue({
		...project("cached"),
		drawings: [],
		diary: { rows: [], mediaPhotos: [] },
	});
	jest
		.mocked(global.fetch)
		.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				kind: "delta",
				version: "v2",
				revision: "r2",
				changes: {},
				partVersions: {},
				drawings: [],
				drawingOrder: ["missing-floor"],
			}),
		} as Response)
		.mockResolvedValueOnce({
			ok: true,
			json: async () => project("repaired"),
		} as Response);
	render(<Workspace />);
	expect(await screen.findByText("repaired")).toBeInTheDocument();
	expect(global.fetch).toHaveBeenCalledTimes(2);
	expect(jest.mocked(global.fetch).mock.calls[1][1]?.headers).toEqual({});
});

it("isolates restored snapshots when the authenticated organization changes", async () => {
	mockRead
		.mockResolvedValueOnce(project("first-org"))
		.mockResolvedValueOnce(project("second-org"));
	jest.mocked(global.fetch).mockImplementation(() => new Promise(() => {}));
	const workspace = (scope: string) => (
		<ProjectLoadingProgressProvider
			enabled
			visualPreloadEnabled
			cacheScope={scope}
		>
			<LimeniProjectData siteId="site">
				<Consumer />
			</LimeniProjectData>
		</ProjectLoadingProgressProvider>
	);
	const view = render(workspace("user:first"));
	await screen.findByText("first-org");
	view.rerender(workspace("user:second"));
	expect(screen.queryByText("first-org")).not.toBeInTheDocument();
	expect(await screen.findByText("second-org")).toBeInTheDocument();
	expect(PersistentProjectCache).toHaveBeenLastCalledWith(
		"user:second",
		"site",
	);
});

it("does not replace a cached project while a journal save is pending", async () => {
	mockRead.mockResolvedValue(project("cached"));
	let finish!: (response: Response) => void;
	jest.mocked(global.fetch).mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const listeners = new Set<() => void>();
	let saves = getEmpty();
	const getQueue = () => ({
		getSnapshot: () => saves,
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	});
	render(
		<DiarySaveContext.Provider value={getQueue as never}>
			<Workspace />
		</DiarySaveContext.Provider>,
	);
	await screen.findByText("cached");
	await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
	act(() => {
		saves = { ...saves, items: [{ id: "pending" }] } as never;
		for (const listener of listeners) listener();
	});
	await act(async () =>
		finish({ ok: true, json: async () => project("remote") } as Response),
	);
	expect(screen.getByText("cached")).toBeInTheDocument();
	expect(mockWrite).not.toHaveBeenCalled();
	fireEvent.focus(window);
	expect(global.fetch).toHaveBeenCalledTimes(1);
});

it("pauses an inactive project and resumes without reading storage or resetting its draft", async () => {
	jest
		.mocked(global.fetch)
		.mockResolvedValueOnce({
			ok: true,
			json: async () => project("ready"),
		} as Response)
		.mockResolvedValue({ status: 304 } as Response);
	const protect = jest.fn();
	const workspace = (active: boolean) => (
		<WorkspaceActivityContext.Provider
			value={{ active, protect, managed: true }}
		>
			<Workspace />
		</WorkspaceActivityContext.Provider>
	);
	const view = render(workspace(true));
	await screen.findByText("ready");
	fireEvent.change(screen.getByLabelText("Draft"), {
		target: { value: "not saved" },
	});
	view.rerender(workspace(false));
	fireEvent.focus(window);
	expect(global.fetch).toHaveBeenCalledTimes(1);
	view.rerender(workspace(true));
	await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
	expect(mockRead).toHaveBeenCalledTimes(1);
	expect(screen.getByLabelText("Draft")).toHaveValue("not saved");
	expect(screen.getByText("ready")).toBeInTheDocument();
});
