import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import AnalyticsLoading from "@/app/dashboard/sites/[siteId]/analytics/loading";
import ProjectLoading from "@/app/dashboard/sites/[siteId]/loading";
import {
	ProjectLoadingProgressProvider,
	useProjectPreparationReporter,
} from "@/components/providers/ProjectLoadingProgressProvider";
import { VisualProjectView } from "../visual/VisualProjectView";
import { useForma2Refresh } from "./forma2-client-refresh";
import { RetainedLimeniDiary } from "./RetainedLimeniDiary";
import { RetainedLimeniForma2 } from "./RetainedLimeniForma2";

let mockPathname = "/dashboard/sites/site/dashboard";
const mockRouterRefresh = jest.fn();
const mockMounted = jest.fn();
jest.mock("next/navigation", () => ({
	usePathname: () => mockPathname,
	useRouter: () => ({ refresh: mockRouterRefresh }),
}));
jest.mock("./DiarySaveProvider", () => ({
	useDiarySaveQueue: () => ({ snapshot: { revision: 0, items: [] } }),
}));
jest.mock("../visual/VisualView", () => {
	const React = jest.requireActual<typeof import("react")>("react");
	return {
		__esModule: true,
		default: function View() {
			const report = useProjectPreparationReporter("site");
			React.useEffect(() => {
				for (const step of [
					"visual-module",
					"visual-index",
					"visual-drawing",
					"visual-planning",
					"visual-preview",
				])
					report(step);
				mockMounted("visual");
			}, [report]);
			return <input aria-label="Drawing floor" defaultValue="1" />;
		},
	};
});
jest.mock("@/components/sitediary/SiteDiaryList", () => {
	const React = jest.requireActual<typeof import("react")>("react");
	return {
		__esModule: true,
		default: function Diary() {
			const report = useProjectPreparationReporter("site");
			React.useEffect(() => {
				report("settings");
				report("diary");
				mockMounted("diary");
			}, [report]);
			return <input aria-label="Journal filter" defaultValue="" />;
		},
	};
});
jest.mock("./DefaultConstructionForma2View", () => {
	const React = jest.requireActual<typeof import("react")>("react");
	return {
		DefaultConstructionForma2View: function Forma2({
			data,
		}: {
			data: { siteName: string };
		}) {
			const refresh = useForma2Refresh("site");
			React.useEffect(() => {
				mockMounted("forma2");
			}, []);
			return (
				<>
					<input aria-label="Forma 2 filter" defaultValue="" />
					<span>{data.siteName}</span>
					<button type="button" onClick={refresh}>
						Save Forma 2
					</button>
				</>
			);
		},
	};
});

function Shell() {
	return (
		<ProjectLoadingProgressProvider enabled visualPreloadEnabled>
			<VisualProjectView siteId="site">
				<RetainedLimeniDiary siteId="site">
					<RetainedLimeniForma2 siteId="site" />
					<ProjectLoading />
					<AnalyticsLoading />
				</RetainedLimeniDiary>
			</VisualProjectView>
		</ProjectLoadingProgressProvider>
	);
}

function response(value: unknown, etag = '"one"', status = 200) {
	return {
		ok: status === 200,
		status,
		headers: { get: () => etag },
		json: async () => value,
	} as unknown as Response;
}
const settings = {
	siteId: "site",
	userId: "user",
	organizationId: "limeni",
	bisEnabled: false,
	organizationLanguage: "lv",
};
const result = {
	data: { siteName: "Original", resultRows: [], document: null },
	organizationLanguage: "lv",
};
const originalFetch = global.fetch;
beforeEach(() => {
	jest.clearAllMocks();
	mockPathname = "/dashboard/sites/site/dashboard";
	window.scrollTo = jest.fn();
});
afterEach(() => {
	global.fetch = originalFetch;
});

it("starts independent preloads together, gates on every section, and keeps one progress-only screen", async () => {
	let finishSettings!: (value: Response) => void;
	let finishForma2!: (value: Response) => void;
	global.fetch = jest.fn(
		(url) =>
			new Promise<Response>((resolve) => {
				if (String(url).endsWith("limeni-workspace")) finishSettings = resolve;
				else finishForma2 = resolve;
			}),
	);
	const view = render(<Shell />);
	await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
	expect(screen.getAllByRole("progressbar")).toHaveLength(1);
	expect(screen.getAllByRole("status")).toHaveLength(1);
	expect(screen.queryByRole("list")).not.toBeInTheDocument();
	await act(async () => finishForma2(response(result)));
	expect(screen.getByRole("progressbar")).toBeInTheDocument();
	await act(async () => finishSettings(response(settings)));
	await waitFor(() =>
		expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
	);
	const journal = screen.getByLabelText("Journal filter");
	const drawing = screen.getByLabelText("Drawing floor");
	const forma2 = screen.getByLabelText("Forma 2 filter");
	fireEvent.change(journal, { target: { value: "concrete" } });
	fireEvent.change(drawing, { target: { value: "2" } });
	fireEvent.change(forma2, { target: { value: "saved" } });
	for (const section of [
		"izpildshemas",
		"analytics",
		"dashboard",
		"analytics",
		"izpildshemas",
		"dashboard",
	]) {
		mockPathname = `/dashboard/sites/site/${section}`;
		view.rerender(<Shell />);
		expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Ielādē projektu…")).not.toBeInTheDocument();
	}
	expect(screen.getByLabelText("Journal filter")).toBe(journal);
	expect(journal).toHaveValue("concrete");
	expect(drawing).toHaveValue("2");
	expect(forma2).toHaveValue("saved");
	expect(mockMounted.mock.calls.map((call) => call[0]).sort()).toEqual([
		"diary",
		"forma2",
		"visual",
	]);
	expect(global.fetch).toHaveBeenCalledTimes(2);
});

it("refreshes Forma 2 in place after edits and keeps cached content through a failed background request", async () => {
	global.fetch = jest.fn(async (url) =>
		response(String(url).endsWith("limeni-workspace") ? settings : result),
	);
	mockPathname = "/dashboard/sites/site/analytics";
	render(<Shell />);
	await screen.findByText("Original");
	await waitFor(() =>
		expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
	);
	const filter = screen.getByLabelText("Forma 2 filter");
	fireEvent.change(filter, { target: { value: "keep" } });
	jest
		.mocked(global.fetch)
		.mockResolvedValueOnce(
			response(
				{ ...result, data: { ...result.data, siteName: "Updated" } },
				'"two"',
			),
		);
	fireEvent.click(screen.getByText("Save Forma 2"));
	await screen.findByText("Updated");
	expect(filter).toHaveValue("keep");
	expect(mockRouterRefresh).not.toHaveBeenCalled();
	jest.mocked(global.fetch).mockRejectedValueOnce(new Error("Offline"));
	fireEvent.click(screen.getByText("Save Forma 2"));
	await screen.findByText(/Neizdevās atjaunot Forma 2/);
	expect(screen.getByText("Updated")).toBeVisible();
	expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
	jest.mocked(global.fetch).mockResolvedValueOnce(response(null, '"two"', 304));
	fireEvent.click(screen.getByText("Mēģināt vēlreiz"));
	await waitFor(() =>
		expect(
			screen.queryByText(/Neizdevās atjaunot Forma 2/),
		).not.toBeInTheDocument(),
	);
	expect(screen.getByText("Updated")).toBeVisible();
	expect(jest.mocked(global.fetch).mock.calls.at(-1)?.[1]?.headers).toEqual({
		"If-None-Match": '"two"',
	});
});
