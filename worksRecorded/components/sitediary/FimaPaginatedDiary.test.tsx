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
	jest.spyOn(window, "scrollTo").mockImplementation(() => {});
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
	jest.restoreAllMocks();
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

it("combines FIMA filters, preserves them across pages and export, then clears them", async () => {
	mount();
	fireEvent.change(screen.getByRole("combobox", { name: "Rīcība" }), {
		target: { value: "needs_changes" },
	});
	fireEvent.change(screen.getByRole("combobox", { name: "BIS ieraksts" }), {
		target: { value: "missing" },
	});
	fireEvent.change(screen.getByRole("combobox", { name: "Materiāli" }), {
		target: { value: "missing" },
	});
	fireEvent.change(screen.getByRole("combobox", { name: "Paraugas" }), {
		target: { value: "present" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Filtrēt" }));
	await waitFor(() =>
		expect(window.location.search).toBe(
			"?review=needs_changes&bis=missing&materials=missing&examples=present",
		),
	);
	expect(screen.getByRole("combobox", { name: "Materiāli" })).toHaveValue(
		"missing",
	);
	next();
	await waitFor(() => expect(window.location.search).toContain("page=2"));
	expect(screen.getByRole("link", { name: "Eksportēt" })).toHaveAttribute(
		"href",
		"/api/all-projects/export?review=needs_changes&bis=missing&materials=missing&examples=present&page=2",
	);
	fireEvent.click(screen.getByRole("button", { name: "Notīrīt" }));
	await waitFor(() => expect(window.location.search).toBe(""));
	expect(screen.getAllByText("1 / 3")).toHaveLength(2);
	expect(screen.getByRole("combobox", { name: "Paraugas" })).toHaveValue("");
	expect(screen.getByRole("link", { name: "Eksportēt" })).toHaveAttribute(
		"href",
		"/api/all-projects/export?",
	);
});

it("restores the original page after changing filters and navigating filtered pages", async () => {
	mount();
	next();
	await screen.findByText("row-2");
	next();
	await screen.findByText("row-3");
	fireEvent.click(screen.getByRole("button", { name: "Select record" }));
	fireEvent.change(screen.getByRole("textbox", { name: "Meklēt" }), {
		target: { value: "cable" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Filtrēt" }));
	await waitFor(() => expect(window.location.search).toBe("?q=cable"));
	next();
	await waitFor(() => expect(window.location.search).toBe("?q=cable&page=2"));
	fireEvent.change(screen.getByRole("combobox", { name: "BIS ieraksts" }), {
		target: { value: "missing" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Filtrēt" }));
	await waitFor(() =>
		expect(window.location.search).toBe("?q=cable&bis=missing"),
	);
	fireEvent.click(screen.getByRole("button", { name: "Notīrīt" }));
	await waitFor(() => expect(window.location.search).toBe("?page=3"));
	expect(screen.getByText("row-3")).toBeInTheDocument();
	expect(screen.getByText("Still selected")).toBeInTheDocument();
});

it("restores a page beyond the filtered page count when the last filter is removed manually", async () => {
	mount();
	next();
	await screen.findByText("row-2");
	next();
	await screen.findByText("row-3");
	jest.mocked(global.fetch).mockResolvedValueOnce({
		ok: true,
		json: async () => ({
			...first,
			page: 1,
			totalPages: 1,
			totalCount: 1,
			rows: [{ id: "filtered-row" }],
		}),
	} as Response);
	fireEvent.change(screen.getByRole("textbox", { name: "Meklēt" }), {
		target: { value: "cable" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Filtrēt" }));
	await screen.findByText("filtered-row");
	expect(screen.getAllByText("1 / 1")).toHaveLength(2);
	fireEvent.change(screen.getByRole("textbox", { name: "Meklēt" }), {
		target: { value: "" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Filtrēt" }));
	await screen.findByText("row-3");
	expect(window.location.search).toBe("?page=3");
	expect(screen.getAllByText("3 / 3")).toHaveLength(2);
});

it("keeps the return page through a failed clear and retry after cache invalidation", async () => {
	mount();
	next();
	await screen.findByText("row-2");
	fireEvent.change(screen.getByRole("textbox", { name: "Meklēt" }), {
		target: { value: "cable" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Filtrēt" }));
	await waitFor(() => expect(window.location.search).toBe("?q=cable"));
	fireEvent.click(screen.getByRole("button", { name: "Saved edit" }));
	jest.mocked(global.fetch).mockRejectedValueOnce(new Error("Offline"));
	fireEvent.click(screen.getByRole("button", { name: "Notīrīt" }));
	expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
	expect(window.location.search).toBe("?q=cable");
	fireEvent.click(screen.getByRole("button", { name: "Mēģināt vēlreiz" }));
	await screen.findByText("row-2");
	expect(window.location.search).toBe("?page=2");
});

it("keeps the current page when clearing unapplied filter changes", async () => {
	mount();
	next();
	await screen.findByText("row-2");
	fireEvent.change(screen.getByRole("textbox", { name: "Meklēt" }), {
		target: { value: "cable" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Notīrīt" }));
	await waitFor(() =>
		expect(screen.getByRole("textbox", { name: "Meklēt" })).toHaveValue(""),
	);
	expect(window.location.search).toBe("?page=2");
	expect(screen.getByText("row-2")).toBeInTheDocument();
});

it("does not let a late response replace a newer browser-history navigation", async () => {
	let finish!: (value: Response) => void;
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
		} as Response),
	);
	expect(screen.queryByText("late-row")).not.toBeInTheDocument();
	expect(window.location.search).toBe("");
});

it("jumps directly from either pagination bar, retains filters, and returns to the original distant page", async () => {
	const manyPages = { ...first, totalPages: 52, totalCount: 2600 };
	jest.mocked(global.fetch).mockImplementation(async (url) => {
		const params = new URL(String(url), "http://localhost").searchParams;
		const page = Number(params.get("page") || 1);
		return {
			ok: true,
			json: async () => ({ ...manyPages, page, rows: [{ id: `row-${page}` }] }),
		} as Response;
	});
	render(
		<FimaPaginatedDiary
			initialPage={manyPages}
			initialQuery=""
			projects={[]}
			messages={messages}
		/>,
	);
	fireEvent.click(screen.getByRole("button", { name: "Select record" }));
	fireEvent.change(screen.getAllByRole("spinbutton", { name: "Uz lapu" })[1], {
		target: { value: "15" },
	});
	fireEvent.click(screen.getAllByRole("button", { name: "Iet" })[1]);
	await screen.findByText("row-15");
	expect(window.location.search).toBe("?page=15");
	await waitFor(() => {
		for (const input of screen.getAllByRole("spinbutton", { name: "Uz lapu" }))
			expect(input).toHaveValue(15);
	});
	fireEvent.change(screen.getByRole("textbox", { name: "Meklēt" }), {
		target: { value: "cable" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Filtrēt" }));
	await waitFor(() => expect(window.location.search).toBe("?q=cable"));
	fireEvent.change(screen.getAllByRole("spinbutton", { name: "Uz lapu" })[0], {
		target: { value: "12" },
	});
	fireEvent.click(screen.getAllByRole("button", { name: "Iet" })[0]);
	await screen.findByText("row-12");
	expect(window.location.search).toBe("?q=cable&page=12");
	expect(screen.getByRole("link", { name: "Eksportēt" })).toHaveAttribute(
		"href",
		"/api/all-projects/export?q=cable&page=12",
	);
	fireEvent.click(screen.getByRole("button", { name: "Notīrīt" }));
	await screen.findByText("row-15");
	expect(window.location.search).toBe("?page=15");
	expect(screen.getByText("Still selected")).toBeInTheDocument();
});
