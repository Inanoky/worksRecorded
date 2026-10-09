import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { DIARY_PHOTO_DELETED } from "@/lib/photos/photo-deleted-event";
import {
	deleteVisualDrawing,
	getVisualDrawings,
	getVisualWorkTypes,
	refreshVisualDrawing,
	restartVisualDrawing,
} from "./actions";
import type { VisualDrawing } from "./model";
import { visualDiaryDay } from "./timeline";
import VisualView from "./VisualView";

const mockUpload = jest.fn();
jest.mock("@/lib/utils/UploadthingsComponents", () => ({
	useUploadThing: () => ({ startUpload: mockUpload }),
}));
jest.mock("./actions", () => ({
	getVisualDrawings: jest.fn(),
	refreshVisualDrawing: jest.fn(),
	deleteVisualDrawing: jest.fn(),
	restartVisualDrawing: jest.fn(),
	saveVisualPolygon: jest.fn(),
	getVisualWorkTypes: jest.fn(),
	saveVisualWorkType: jest.fn(),
	resolveVisualSourceReview: jest.fn(),
}));
jest.mock("./VisualPdf", () => ({
	VisualPdf: ({
		marks,
		onSelect,
	}: {
		marks: unknown[];
		onSelect: (id: string | null) => void;
	}) => (
		<div data-testid="pdf">
			{marks.length} zones
			<button type="button" onClick={() => onSelect(null)}>
				Empty drawing
			</button>
		</div>
	),
}));
jest.mock("@/components/ui/select", () => ({
	Select: ({
		children,
		value,
		onValueChange,
		disabled,
	}: {
		children: ReactNode;
		value: string;
		onValueChange: (value: string) => void;
		disabled: boolean;
	}) => (
		<select
			value={value}
			disabled={disabled}
			onChange={(event) => onValueChange(event.target.value)}
		>
			<option value="">Select</option>
			{children}
		</select>
	),
	SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
	SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
		<option value={value}>{children}</option>
	),
	SelectTrigger: () => null,
	SelectValue: () => null,
}));

const originalFetch = global.fetch;
const mockFetch = jest.fn();
const complete: VisualDrawing = {
	id: "drawing",
	name: "plan.pdf",
	createdAt: "2026-09-23",
	state: {
		version: 1,
		location: "1. stāvs",
		status: "complete",
		pageCount: 1,
		processed: 1,
		evidence: [
			{
				id: "photo",
				recordId: "record",
				photoUrl: "https://example.com/photo.jpg",
				work: "Smilts",
				location: "1. stāvs",
				description: "Pabeigts",
				date: null,
				amount: 10,
				unit: "m2",
			},
		],
		marks: [
			{
				id: "mark",
				evidenceId: "photo",
				layer: "sand",
				page: 1,
				confidence: 0.95,
				polygon: [
					{ x: 0, y: 0 },
					{ x: 1, y: 0 },
					{ x: 1, y: 1 },
				],
				anchors: ["A", "B"],
				explanation: "Sakrīt",
			},
		],
		unlocated: [],
		error: null,
		lockedAt: null,
		attempts: [],
	},
};

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getVisualWorkTypes).mockResolvedValue(["Smilts", "XPS"]);
	jest.mocked(refreshVisualDrawing).mockResolvedValue({
		drawing: complete,
		addedCount: 0,
		updatedCount: 0,
		removedCount: 0,
		analysisCount: 0,
		reviewCount: 0,
	});
	jest.mocked(deleteVisualDrawing).mockResolvedValue(undefined);
	global.fetch = mockFetch;
	jest.mocked(getVisualDrawings).mockResolvedValue({
		locations: ["1. stāvs", "2. stāvs"],
		drawings: [
			{
				id: "drawing",
				name: "plan.pdf",
				location: "1. stāvs",
				createdAt: "2026-09-23",
				status: "complete",
			},
		],
	});
	mockFetch.mockResolvedValue({ ok: true, json: async () => complete });
	mockUpload.mockResolvedValue([{ serverData: { drawingId: "drawing" } }]);
});
afterEach(() => {
	global.fetch = originalFetch;
	jest.useRealTimers();
});

async function selectLocation() {
	await screen.findByRole("option", { name: "1. stāvs" });
	fireEvent.change(screen.getAllByRole("combobox")[0], {
		target: { value: "1. stāvs" },
	});
	await screen.findByTestId("pdf");
}

async function selectDrawing() {
	render(<VisualView siteId="site" />);
	await selectLocation();
}

it("clears the selected source card on an empty drawing click but protects unsaved work edits", async () => {
	await selectDrawing();
	const sidebar = screen.getByRole("complementary", {
		name: "Darbu slāņi un avoti",
	});
	fireEvent.click(within(sidebar).getAllByRole("button")[0]);
	expect(screen.getByText("Izvēlētā zona")).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Empty drawing" }));
	expect(screen.queryByText("Izvēlētā zona")).not.toBeInTheDocument();
	fireEvent.click(within(sidebar).getAllByRole("button")[0]);
	await waitFor(() =>
		expect(screen.getByLabelText("Darba tips")).toBeEnabled(),
	);
	fireEvent.change(screen.getByLabelText("Darba tips"), {
		target: { value: "XPS" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Empty drawing" }));
	expect(screen.getByText("Izvēlētā zona")).toBeInTheDocument();
	expect(screen.getByLabelText("Darba tips")).toHaveValue("XPS");
});

it("automatically checks the retained drawing, pauses when hidden and checks again on return without remounting the map", async () => {
	jest.useFakeTimers();
	const { rerender } = render(<VisualView siteId="site" active />);
	await selectLocation();
	const pdf = screen.getByTestId("pdf");
	mockFetch.mockClear();
	await act(async () => jest.advanceTimersByTime(1000));
	expect(refreshVisualDrawing).toHaveBeenCalledTimes(1);
	expect(mockFetch).not.toHaveBeenCalled();
	rerender(<VisualView siteId="site" active={false} />);
	await act(async () => jest.advanceTimersByTime(90_000));
	expect(refreshVisualDrawing).toHaveBeenCalledTimes(1);
	rerender(<VisualView siteId="site" active />);
	await act(async () => jest.advanceTimersByTime(1000));
	expect(refreshVisualDrawing).toHaveBeenCalledTimes(2);
	expect(screen.getByTestId("pdf")).toBe(pdf);
	expect(screen.getAllByRole("combobox")[0]).toHaveValue("1. stāvs");
});

it("runs new-image analysis automatically with inline progress and retains the map after a failed call", async () => {
	jest.useFakeTimers();
	const updated: VisualDrawing = {
		...complete,
		state: {
			...complete.state,
			status: "paused",
			evidence: [
				...complete.state.evidence,
				{ ...complete.state.evidence[0], id: "new", recordId: "new" },
			],
		},
	};
	jest.mocked(refreshVisualDrawing).mockResolvedValueOnce({
		drawing: updated,
		addedCount: 1,
		updatedCount: 0,
		removedCount: 0,
		analysisCount: 1,
		reviewCount: 0,
	});
	await selectDrawing();
	const pdf = screen.getByTestId("pdf");
	let fail!: (reason: unknown) => void;
	mockFetch.mockImplementation(
		() =>
			new Promise((_resolve, reject) => {
				fail = reject;
			}),
	);
	await act(async () => jest.advanceTimersByTime(1000));
	expect(mockFetch).toHaveBeenCalledWith("/api/sites/site/visual/drawing", {
		method: "POST",
	});
	expect(screen.getByText(/Atjaunina zonas/)).toHaveTextContent("2 attēliem");
	expect(screen.getByTestId("pdf")).toBe(pdf);
	await act(async () => fail(new Error("Network failed")));
	expect(screen.getByRole("alert")).toHaveTextContent("Network failed");
	expect(pdf).toHaveTextContent("1 zones");
	await act(async () => jest.advanceTimersByTime(30_000));
	expect(
		mockFetch.mock.calls.filter((call) => call[1]?.method === "POST"),
	).toHaveLength(1);
});

it("ends the slider at the latest diary day even when analyzed photos stop earlier", async () => {
	mockFetch.mockResolvedValue({
		ok: true,
		json: async () => ({
			...complete,
			latestDiaryDate: "2026-09-29T12:00:00Z",
			state: {
				...complete.state,
				evidence: [
					{ ...complete.state.evidence[0], date: "2026-09-28T12:00:00Z" },
				],
			},
		}),
	});
	await selectDrawing();
	const slider = screen.getByRole("slider", { name: "Progresa datums" });
	expect(slider).toHaveAttribute("max", String(visualDiaryDay("2026-09-29")));
	expect(slider).toHaveAttribute("aria-valuetext", "29.09.2026");
	expect(screen.getByTestId("pdf")).toHaveTextContent("1 zones");
	expect(
		mockFetch.mock.calls.every(([, options]) => options?.method !== "POST"),
	).toBe(true);
});

it("hides and shows all layers instantly, including from a mixed selection", async () => {
	await selectDrawing();
	mockFetch.mockClear();
	const pdf = screen.getByTestId("pdf");
	fireEvent.click(screen.getByRole("checkbox", { name: "Paslēpt visus" }));
	expect(pdf).toHaveTextContent("0 zones");
	expect(
		screen.getByRole("checkbox", { name: "Smilts (1)" }),
	).not.toBeChecked();
	fireEvent.click(screen.getByRole("checkbox", { name: "Rādīt visus" }));
	expect(pdf).toHaveTextContent("1 zones");
	fireEvent.click(screen.getByRole("checkbox", { name: "Smilts (1)" }));
	expect(screen.getByRole("checkbox", { name: "Rādīt visus" })).toHaveAttribute(
		"aria-checked",
		"mixed",
	);
	fireEvent.click(screen.getByRole("checkbox", { name: "Rādīt visus" }));
	expect(pdf).toHaveTextContent("1 zones");
	expect(screen.getByRole("checkbox", { name: "Paslēpt visus" })).toBeChecked();
	expect(screen.getByTestId("pdf")).toBe(pdf);
	expect(mockFetch).not.toHaveBeenCalled();
});

it("removes deleted-photo zones from the retained view without reloading or changing location", async () => {
	await selectDrawing();
	const pdf = screen.getByTestId("pdf");
	mockFetch.mockClear();
	act(() =>
		window.dispatchEvent(
			new CustomEvent(DIARY_PHOTO_DELETED, {
				detail: {
					siteId: "other",
					deletedUrls: [complete.state.evidence[0].photoUrl],
					deletedRecordIds: [complete.state.evidence[0].recordId],
				},
			}),
		),
	);
	expect(pdf).toHaveTextContent("1 zones");
	act(() =>
		window.dispatchEvent(
			new CustomEvent(DIARY_PHOTO_DELETED, {
				detail: {
					siteId: "site",
					deletedUrls: [complete.state.evidence[0].photoUrl],
					deletedRecordIds: ["different-copy"],
				},
			}),
		),
	);
	expect(pdf).toHaveTextContent("1 zones");
	act(() =>
		window.dispatchEvent(
			new CustomEvent(DIARY_PHOTO_DELETED, {
				detail: {
					siteId: "site",
					deletedUrls: [complete.state.evidence[0].photoUrl],
					deletedRecordIds: [complete.state.evidence[0].recordId],
				},
			}),
		),
	);
	expect(pdf).toHaveTextContent("0 zones");
	expect(screen.getAllByRole("combobox")[0]).toHaveValue("1. stāvs");
	expect(mockFetch).not.toHaveBeenCalled();
});

it("does not reload the PDF or call AI when the diary has no new photos", async () => {
	jest.mocked(refreshVisualDrawing).mockResolvedValue({
		drawing: complete,
		addedCount: 0,
		updatedCount: 0,
		removedCount: 0,
		analysisCount: 0,
		reviewCount: 0,
	});
	await selectDrawing();
	const pdf = screen.getByTestId("pdf");
	mockFetch.mockClear();
	fireEvent.click(screen.getByRole("button", { name: "Atjaunot no žurnāla" }));
	await screen.findByText(/nav jaunu vai mainītu žurnāla attēlu/);
	expect(refreshVisualDrawing).toHaveBeenCalledWith("site", "drawing");
	expect(mockFetch).not.toHaveBeenCalled();
	expect(screen.getByTestId("pdf")).toBe(pdf);
	expect(screen.getAllByRole("combobox")[0]).toHaveValue("1. stāvs");
	expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});

it.each([
	{ addedCount: 1, updatedCount: 0 },
	{ addedCount: 0, updatedCount: 1 },
])(
	"analyzes new or edited records while keeping unrelated zones visible: %j",
	async ({ addedCount, updatedCount }) => {
		const updated: VisualDrawing = {
			...complete,
			state: {
				...complete.state,
				status: "paused",
				evidence: [
					...complete.state.evidence,
					{ ...complete.state.evidence[0], id: "new", recordId: "new-record" },
				],
			},
		};
		jest.mocked(refreshVisualDrawing).mockResolvedValue({
			drawing: updated,
			addedCount,
			updatedCount,
			removedCount: 0,
			analysisCount: addedCount + updatedCount,
			reviewCount: 0,
		});
		await selectDrawing();
		const pdf = screen.getByTestId("pdf");
		let finish!: (value: unknown) => void;
		mockFetch.mockImplementation(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Atjaunot no žurnāla" }),
		);
		await waitFor(() =>
			expect(mockFetch).toHaveBeenLastCalledWith(
				"/api/sites/site/visual/drawing",
				{ method: "POST" },
			),
		);
		expect(screen.getByTestId("pdf")).toBe(pdf);
		expect(pdf).toHaveTextContent("1 zones");
		expect(
			screen.getByText(
				new RegExp(
					`Pievienoti ${addedCount} jauni attēli. Atjaunināti ${updatedCount}`,
				),
			),
		).toBeInTheDocument();
		await act(async () =>
			finish({
				ok: true,
				json: async () => ({
					...updated,
					state: { ...updated.state, status: "complete", processed: 2 },
				}),
			}),
		);
		expect(screen.getByTestId("pdf")).toBe(pdf);
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Atjaunot no žurnāla" }),
			).toBeEnabled(),
		);
	},
);

it("retains the selected drawing when checking for new diary photos fails", async () => {
	jest
		.mocked(refreshVisualDrawing)
		.mockRejectedValue(new Error("Update failed"));
	await selectDrawing();
	const pdf = screen.getByTestId("pdf");
	fireEvent.click(screen.getByRole("button", { name: "Atjaunot no žurnāla" }));
	expect(await screen.findByRole("alert")).toHaveTextContent("Update failed");
	expect(screen.getByTestId("pdf")).toBe(pdf);
});

it("requires confirmation before deletion and removes the drawing from the view", async () => {
	await selectDrawing();
	fireEvent.click(screen.getByRole("button", { name: "Dzēst rasējumu" }));
	expect(screen.getByRole("alertdialog")).toBeInTheDocument();
	expect(deleteVisualDrawing).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Atcelt" }));
	expect(deleteVisualDrawing).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Dzēst rasējumu" }));
	fireEvent.click(screen.getByRole("button", { name: "Jā, dzēst" }));
	await waitFor(() =>
		expect(screen.queryByTestId("pdf")).not.toBeInTheDocument(),
	);
	expect(deleteVisualDrawing).toHaveBeenCalledWith("site", "drawing");
	expect(screen.queryByText("plan.pdf")).not.toBeInTheDocument();
});

it("keeps the drawing visible when deletion fails", async () => {
	jest.mocked(deleteVisualDrawing).mockRejectedValue(new Error("Failed"));
	await selectDrawing();
	fireEvent.click(screen.getByRole("button", { name: "Dzēst rasējumu" }));
	fireEvent.click(screen.getByRole("button", { name: "Jā, dzēst" }));
	expect(await screen.findByRole("alert")).toHaveTextContent("Neizdevās dzēst");
	expect(screen.getByTestId("pdf")).toBeInTheDocument();
});

it("restarts a completed analysis only after confirmation", async () => {
	await selectDrawing();
	fireEvent.click(
		screen.getByRole("button", { name: "Sākt analīzi no jauna" }),
	);
	expect(restartVisualDrawing).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Jā, sākt no jauna" }));
	await waitFor(() =>
		expect(mockFetch).toHaveBeenCalledWith("/api/sites/site/visual/drawing", {
			method: "POST",
		}),
	);
	expect(restartVisualDrawing).toHaveBeenCalledWith("site", "drawing");
	expect(mockUpload).not.toHaveBeenCalled();
	await waitFor(() =>
		expect(
			screen.getByRole("button", { name: "Sākt analīzi no jauna" }),
		).not.toBeDisabled(),
	);
});

it("loads saved location drawings and toggles layer visibility instantly", async () => {
	render(<VisualView siteId="site" />);
	await selectLocation();
	expect(screen.getAllByRole("combobox")).toHaveLength(1);
	expect(await screen.findByTestId("pdf")).toHaveTextContent("1 zones");
	fireEvent.click(screen.getByRole("checkbox", { name: "Smilts (1)" }));
	expect(screen.getByTestId("pdf")).toHaveTextContent("0 zones");
	expect(mockFetch).toHaveBeenCalledTimes(1);
	fireEvent.change(screen.getAllByRole("combobox")[0], {
		target: { value: "2. stāvs" },
	});
	expect(screen.queryByTestId("pdf")).not.toBeInTheDocument();
	expect(screen.getByText("Rasējums vēl nav pievienots")).toBeInTheDocument();
	expect(mockFetch).toHaveBeenCalledTimes(1);
	expect(mockUpload).not.toHaveBeenCalled();
});

it("places layer toggles and dated sources in the sidebar in chronological order", async () => {
	mockFetch.mockResolvedValue({
		ok: true,
		json: async () => ({
			...complete,
			state: {
				...complete.state,
				evidence: [
					{
						...complete.state.evidence[0],
						id: "late",
						date: "2026-09-23T09:00:00Z",
						work: "Later work",
					},
					{
						...complete.state.evidence[0],
						id: "early",
						date: "2026-09-20T09:00:00Z",
						work: "Earlier work",
					},
				],
				marks: ["late", "early"].map((id) => ({
					...complete.state.marks[0],
					id,
					evidenceId: id,
				})),
			},
		}),
	});
	await selectDrawing();
	const sidebar = screen.getByRole("complementary", {
		name: "Darbu slāņi un avoti",
	});
	expect(
		within(sidebar).getByRole("checkbox", { name: "Smilts (2)" }),
	).toBeInTheDocument();
	const entries = within(sidebar).getAllByRole("button");
	expect(sidebar).toHaveClass("lg:order-1");
	expect(sidebar.parentElement).toHaveClass(
		"lg:grid-cols-[280px_minmax(0,1fr)]",
	);
	expect(entries[0]).toHaveTextContent("20.09.2026");
	expect(entries[0]).toHaveTextContent("Earlier work");
	expect(entries[1]).toHaveTextContent("23.09.2026");
	expect(entries[1]).toHaveTextContent("Later work");
	fireEvent.click(entries[0]);
	expect(within(sidebar).getByText("Pabeigts")).toBeInTheDocument();
	expect(within(sidebar).queryByText("Sakrīt")).not.toBeInTheDocument();
	expect(within(sidebar).queryByText("A; B")).not.toBeInTheDocument();
	expect(
		within(sidebar).queryByText(/Aptuvens izvietojums/),
	).not.toBeInTheDocument();
});

it("uploads with the selected project/location and runs saved analysis", async () => {
	render(<VisualView siteId="site" />);
	await selectLocation();
	fireEvent.click(screen.getByText("Aizstāt PDF rasējumu"));
	const file = new File(["%PDF-1.7"], "plan.pdf", { type: "application/pdf" });
	fireEvent.change(screen.getByLabelText(/Jauns PDF/), {
		target: { files: [file] },
	});
	fireEvent.click(
		screen.getByRole("button", { name: "Augšupielādēt un analizēt" }),
	);
	expect(mockUpload).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Jā, aizstāt" }));
	await waitFor(() =>
		expect(mockFetch).toHaveBeenCalledWith("/api/sites/site/visual/drawing", {
			method: "POST",
		}),
	);
	expect(mockUpload).toHaveBeenCalledWith([file], {
		replaceDrawingId: "drawing",
		siteId: "site",
		location: "1. stāvs",
	});
	await waitFor(() =>
		expect(
			screen.getByRole("button", { name: "Atjaunot no žurnāla" }),
		).not.toBeDisabled(),
	);
});

it("clearly displays a cannot-locate result", async () => {
	mockFetch.mockResolvedValue({
		ok: true,
		json: async () => ({
			...complete,
			state: {
				...complete.state,
				status: "unlocated",
				marks: [],
				error: "Nevar atrast darbus: cita ēka.",
			},
		}),
	});
	render(<VisualView siteId="site" />);
	await selectLocation();
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Nevar atrast darbus",
	);
	expect(screen.getByTestId("pdf")).toHaveTextContent("0 zones");
});

it("rejects non-PDF uploads before calling the server", async () => {
	render(<VisualView siteId="site" />);
	await selectLocation();
	fireEvent.click(screen.getByText("Aizstāt PDF rasējumu"));
	fireEvent.change(screen.getByLabelText(/Jauns PDF/), {
		target: {
			files: [new File(["not pdf"], "test.txt", { type: "text/plain" })],
		},
	});
	fireEvent.click(
		screen.getByRole("button", { name: "Augšupielādēt un analizēt" }),
	);
	fireEvent.click(screen.getByRole("button", { name: "Jā, aizstāt" }));
	expect(await screen.findByRole("alert")).toHaveTextContent("Izvēlieties PDF");
	expect(mockUpload).not.toHaveBeenCalled();
});

it("slides cumulative dates and applies layer filters without fetching or reanalyzing", async () => {
	const dates = ["2026-09-20T09:00:00Z", "2026-09-22T09:00:00Z", null];
	mockFetch.mockResolvedValue({
		ok: true,
		json: async () => ({
			...complete,
			state: {
				...complete.state,
				evidence: dates.map((date, i) => ({
					...complete.state.evidence[0],
					id: `photo-${i}`,
					date,
				})),
				marks: dates.map((_, i) => ({
					...complete.state.marks[0],
					id: `mark-${i}`,
					evidenceId: `photo-${i}`,
				})),
			},
		}),
	});
	await selectDrawing();
	expect(screen.getByTestId("pdf")).toHaveTextContent("2 zones");
	fireEvent.change(screen.getByRole("slider", { name: "Progresa datums" }), {
		target: { value: visualDiaryDay("2026-09-21") },
	});
	expect(screen.getByTestId("pdf")).toHaveTextContent("1 zones");
	expect(screen.getByRole("slider")).toHaveAttribute(
		"aria-valuetext",
		"21.09.2026",
	);
	fireEvent.click(screen.getByRole("button", { name: "Nākamā diena" }));
	expect(screen.getByTestId("pdf")).toHaveTextContent("2 zones");
	fireEvent.click(
		screen.getByRole("checkbox", { name: "Rādīt arī zonas bez datuma (1)" }),
	);
	expect(screen.getByTestId("pdf")).toHaveTextContent("3 zones");
	fireEvent.click(screen.getByRole("checkbox", { name: "Smilts (3)" }));
	expect(screen.getByTestId("pdf")).toHaveTextContent("0 zones");
	expect(mockFetch).toHaveBeenCalledTimes(1);
	expect(mockUpload).not.toHaveBeenCalled();
});

it("shows all undated zones without assigning them an invented date", async () => {
	await selectDrawing();
	expect(screen.queryByRole("slider")).not.toBeInTheDocument();
	expect(screen.getByTestId("pdf")).toHaveTextContent("1 zones");
	expect(screen.getByText(/Nav datētu ierakstu/)).toBeInTheDocument();
});

it("shows a disabled date slider when there is only one diary day", async () => {
	mockFetch.mockResolvedValue({
		ok: true,
		json: async () => ({
			...complete,
			state: {
				...complete.state,
				evidence: [{ ...complete.state.evidence[0], date: "2026-09-20" }],
			},
		}),
	});
	await selectDrawing();
	expect(screen.getByRole("slider")).toBeDisabled();
	expect(
		screen.getByRole("button", { name: "Iepriekšējā diena" }),
	).toBeDisabled();
	expect(screen.getByRole("button", { name: "Nākamā diena" })).toBeDisabled();
});

it("ignores an old drawing response after switching to an unassigned location", async () => {
	let finishLoad: (value: unknown) => void = () => {};
	mockFetch.mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finishLoad = resolve;
			}),
	);
	render(<VisualView siteId="site" />);
	await screen.findByRole("option", { name: "1. stāvs" });
	fireEvent.change(screen.getByRole("combobox"), {
		target: { value: "1. stāvs" },
	});
	expect(screen.getByText("Ielādē…")).toBeInTheDocument();
	fireEvent.change(screen.getByRole("combobox"), {
		target: { value: "2. stāvs" },
	});
	await act(async () => {
		finishLoad({ ok: true, json: async () => complete });
	});
	expect(screen.getByRole("combobox")).toHaveValue("2. stāvs");
	expect(screen.queryByTestId("pdf")).not.toBeInTheDocument();
	expect(screen.queryByText("Ielādē…")).not.toBeInTheDocument();
});

it("can retry loading the assigned drawing without a second selector", async () => {
	mockFetch.mockRejectedValueOnce(new Error("Network"));
	render(<VisualView siteId="site" />);
	await screen.findByRole("option", { name: "1. stāvs" });
	fireEvent.change(screen.getByRole("combobox"), {
		target: { value: "1. stāvs" },
	});
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Neizdevās ielādēt rasējumu",
	);
	fireEvent.click(screen.getByRole("button", { name: "Mēģināt vēlreiz" }));
	await screen.findByTestId("pdf");
	expect(mockFetch).toHaveBeenCalledTimes(2);
	expect(mockFetch).toHaveBeenLastCalledWith("/api/sites/site/visual/drawing", {
		cache: "no-store",
	});
});

it("shows the loading state while waiting for an analysis batch", async () => {
	const pending = {
		...complete,
		state: { ...complete.state, status: "uploaded", processed: 0, marks: [] },
	};
	let finishBatch: (value: unknown) => void = () => {};
	mockFetch.mockImplementation((_url, options) =>
		options?.method === "POST"
			? new Promise((resolve) => {
					finishBatch = resolve;
				})
			: Promise.resolve({ ok: true, json: async () => pending }),
	);
	await selectDrawing();
	fireEvent.click(screen.getByRole("button", { name: "Turpināt analīzi" }));
	await waitFor(() =>
		expect(
			screen.getByText(/Analizēti 0 no 1 · Atlikušie attēli: 1/),
		).toBeInTheDocument(),
	);
	expect(screen.getByText("Analizē attēlus…")).toBeInTheDocument();
	expect(
		screen.getByRole("progressbar", { name: "Analizētie attēli" }),
	).toHaveAttribute("value", "0");
	await act(async () => {
		finishBatch({ ok: true, json: async () => complete });
	});
	await waitFor(() =>
		expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
	);
	expect(screen.getByTestId("pdf")).toHaveTextContent("1 zones");
});

it("polls live progress during POST and never overwrites completion with a stale poll", async () => {
	jest.useFakeTimers();
	const pending: VisualDrawing = {
		...complete,
		state: { ...complete.state, status: "uploaded", processed: 0, marks: [] },
	};
	let saved = pending;
	let finish: (value: unknown) => void = () => {};
	mockFetch.mockImplementation((_url, options) =>
		options?.method === "POST"
			? new Promise((resolve) => {
					finish = resolve;
				})
			: Promise.resolve({ ok: true, json: async () => saved }),
	);
	await selectDrawing();
	fireEvent.click(screen.getByRole("button", { name: "Turpināt analīzi" }));
	await act(async () => {});
	saved = {
		...complete,
		state: {
			...complete.state,
			status: "running",
			lockedAt: Date.now(),
			attempts: [
				{ id: "new-run" } as VisualDrawing["state"]["attempts"][number],
			],
		},
	};
	await act(async () => {
		await jest.advanceTimersByTimeAsync(1000);
	});
	expect(screen.getByText(/Analizēti 1 no 1/)).toBeInTheDocument();
	expect(screen.getByTestId("pdf")).toHaveTextContent("1 zones");
	let stale: (value: unknown) => void = () => {};
	mockFetch.mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				stale = resolve;
			}),
	);
	await act(async () => {
		await jest.advanceTimersByTimeAsync(1500);
	});
	await act(async () => {
		finish({ ok: true, json: async () => complete });
	});
	expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
	await act(async () => {
		stale({ ok: true, json: async () => pending });
	});
	expect(screen.getByTestId("pdf")).toHaveTextContent("1 zones");
	expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
	expect(
		mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
	).toHaveLength(1);
});

it("reopens running analysis with polling but does not start another AI request", async () => {
	jest.useFakeTimers();
	let saved: VisualDrawing = {
		...complete,
		state: {
			...complete.state,
			status: "running",
			lockedAt: Date.now(),
			processed: 0,
			marks: [],
		},
	};
	mockFetch.mockImplementation(() =>
		Promise.resolve({ ok: true, json: async () => saved }),
	);
	const view = render(<VisualView siteId="site" />);
	await selectLocation();
	expect(
		screen.getByRole("button", { name: "Turpināt analīzi" }),
	).toBeDisabled();
	saved = complete;
	await act(async () => {
		await jest.advanceTimersByTimeAsync(1000);
	});
	expect(screen.getByTestId("pdf")).toHaveTextContent("1 zones");
	expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
	const count = mockFetch.mock.calls.length;
	view.unmount();
	await act(async () => {
		await jest.advanceTimersByTimeAsync(10000);
	});
	expect(mockFetch).toHaveBeenCalledTimes(count);
	expect(
		mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
	).toHaveLength(0);
});

it("keeps saved progress visible during a polling failure and reconnects", async () => {
	jest.useFakeTimers();
	const running: VisualDrawing = {
		...complete,
		state: {
			...complete.state,
			status: "running",
			lockedAt: Date.now(),
			processed: 0,
			marks: [],
		},
	};
	mockFetch.mockResolvedValueOnce({ ok: true, json: async () => running });
	mockFetch.mockRejectedValueOnce(new Error("Network unavailable"));
	mockFetch.mockResolvedValue({ ok: true, json: async () => complete });
	await selectDrawing();
	await act(async () => {
		await jest.advanceTimersByTimeAsync(1000);
	});
	expect(screen.getByText(/Mēģinām atjaunot savienojumu/)).toBeInTheDocument();
	expect(screen.getByTestId("pdf")).toHaveTextContent("0 zones");
	await act(async () => {
		await jest.advanceTimersByTimeAsync(1500);
	});
	expect(screen.getByTestId("pdf")).toHaveTextContent("1 zones");
	expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});
