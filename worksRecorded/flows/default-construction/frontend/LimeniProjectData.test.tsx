import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { ProjectLoadingProgressProvider } from "@/components/providers/ProjectLoadingProgressProvider";
import {
	clearPersistentProjects,
	PersistentProjectCache,
} from "../visual/project-persistent-cache";
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
	expect(mockWrite).toHaveBeenCalledWith("snapshot", project("updated"));
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
