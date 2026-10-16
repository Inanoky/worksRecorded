import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { StrictMode } from "react";
import { FimaPaginatedDiary } from "./FimaPaginatedDiary";

jest.mock("./FimaAllProjectsDiary", () => ({
	FimaAllProjectsDiary: ({
		records,
		onRecordsChanged,
	}: {
		records: { id: string }[];
		onRecordsChanged: () => void;
	}) => {
		const React = jest.requireActual("react");
		const [selected, setSelected] = React.useState(false);
		return (
			<div>
				<span>{records[0]?.id}</span>
				<button type="button" onClick={() => setSelected(true)}>
					Select record
				</button>
				{selected ? <aside>Still selected</aside> : null}
				<button type="button" onClick={onRecordsChanged}>
					Saved edit
				</button>
			</div>
		);
	},
}));
const messages = {
	title: "Visi projekti",
	keyword: "Meklēt",
	project: "Projekts",
	allProjects: "Visi projekti",
	from: "No",
	to: "Līdz",
	filter: "Filtrēt",
	clear: "Notīrīt",
	previous: "Iepriekšējā",
	next: "Nākamā",
	records: "ieraksti",
	exportToExcel: "Eksportēt",
};
const first = {
	rows: [],
	page: 1,
	pageSize: 50,
	totalCount: 120,
	totalPages: 3,
};
const originalFetch = global.fetch;
beforeEach(() => {
	window.history.replaceState(null, "", "/dashboard/all-projects");
	global.fetch = jest.fn().mockImplementation(async (url: string) => {
		const params = new URL(url, "http://localhost").searchParams;
		const page = Number(params.get("page") || 1);
		return {
			ok: true,
			json: async () => ({ ...first, page, rows: [{ id: `row-${page}` }] }),
		};
	});
});
afterEach(() => {
	global.fetch = originalFetch;
});
const next = () =>
	fireEvent.click(screen.getAllByRole("button", { name: "Nākamā" })[0]);
const previous = () =>
	fireEvent.click(screen.getAllByRole("button", { name: "Iepriekšējā" })[0]);
const mount = () =>
	render(
		<FimaPaginatedDiary
			initialPage={first}
			initialQuery=""
			projects={[]}
			messages={messages}
		/>,
	);

it("uses prefetched pages, keeps the table mounted and goes back without a request", async () => {
	jest.useFakeTimers();
	mount();
	fireEvent.click(screen.getByRole("button", { name: "Select record" }));
	await act(async () => jest.advanceTimersByTime(401));
	expect(global.fetch).toHaveBeenCalledTimes(1);
	next();
	expect(await screen.findByText("row-2")).toBeInTheDocument();
	expect(screen.getByText("Still selected")).toBeInTheDocument();
	expect(global.fetch).toHaveBeenCalledTimes(1);
	previous();
	await waitFor(() => expect(window.location.search).toBe(""));
	expect(global.fetch).toHaveBeenCalledTimes(1);
	jest.useRealTimers();
});

it("invalidates prefetched pages after a save", async () => {
	jest.useFakeTimers();
	mount();
	await act(async () => jest.advanceTimersByTime(401));
	fireEvent.click(screen.getByRole("button", { name: "Saved edit" }));
	next();
	expect(await screen.findByText("row-2")).toBeInTheDocument();
	expect(global.fetch).toHaveBeenCalledTimes(2);
	jest.useRealTimers();
});

it("retains the current table on failure and supports retry", async () => {
	jest.mocked(global.fetch).mockRejectedValueOnce(new Error("Offline"));
	mount();
	next();
	expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
	expect(window.location.search).toBe("");
	fireEvent.click(screen.getByRole("button", { name: "Mēģināt vēlreiz" }));
	expect(await screen.findByText("row-2")).toBeInTheDocument();
	expect(window.location.search).toBe("?page=2");
});

it("resets pagination when applying filters and restores the query through browser history", async () => {
	mount();
	next();
	await screen.findByText("row-2");
	fireEvent.change(screen.getByRole("textbox", { name: "Meklēt" }), {
		target: { value: "cable" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Filtrēt" }));
	await waitFor(() => expect(window.location.search).toBe("?q=cable"));
	expect(screen.getByRole("link", { name: "Eksportēt" })).toHaveAttribute(
		"href",
		"/api/all-projects/export?q=cable",
	);
	act(() => {
		window.history.replaceState(null, "", "/dashboard/all-projects?page=2");
		window.dispatchEvent(new PopStateEvent("popstate"));
	});
	expect(await screen.findByText("row-2")).toBeInTheDocument();
	expect(screen.getByRole("textbox", { name: "Meklēt" })).toHaveValue("");
});

it("keeps the initial page cached through Strict Mode effect replay", async () => {
	render(
		<StrictMode>
			<FimaPaginatedDiary
				initialPage={first}
				initialQuery=""
				projects={[]}
				messages={messages}
			/>
		</StrictMode>,
	);
	next();
	await screen.findByText("row-2");
	previous();
	await waitFor(() => expect(window.location.search).toBe(""));
	expect(global.fetch).toHaveBeenCalledTimes(1);
});

it("does not let a late response replace a newer browser-history navigation", async () => {
	let finish!: (value: unknown) => void;
	jest.mocked(global.fetch).mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	mount();
	next();
	await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
	act(() => window.dispatchEvent(new PopStateEvent("popstate")));
	await act(async () =>
		finish({
			ok: true,
			json: async () => ({ ...first, page: 2, rows: [{ id: "late-row" }] }),
		}),
	);
	expect(screen.queryByText("late-row")).not.toBeInTheDocument();
	expect(window.location.search).toBe("");
});
