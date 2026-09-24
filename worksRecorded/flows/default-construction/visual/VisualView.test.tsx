import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import {
	deleteVisualDrawing,
	getVisualDrawings,
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
}));
jest.mock("./VisualPdf", () => ({
	VisualPdf: ({ marks }: { marks: unknown[] }) => (
		<div data-testid="pdf">{marks.length} zones</div>
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
});

async function selectLocation() {
	await screen.findByRole("option", { name: "1. stāvs" });
	fireEvent.change(screen.getAllByRole("combobox")[0], {
		target: { value: "1. stāvs" },
	});
}

async function selectDrawing() {
	render(<VisualView siteId="site" />);
	await selectLocation();
	fireEvent.change(screen.getAllByRole("combobox")[1], {
		target: { value: "drawing" },
	});
	await screen.findByTestId("pdf");
}

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
	expect(
		screen.queryByRole("option", { name: /plan.pdf/ }),
	).not.toBeInTheDocument();
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
	fireEvent.change(screen.getAllByRole("combobox")[1], {
		target: { value: "drawing" },
	});
	expect(await screen.findByTestId("pdf")).toHaveTextContent("1 zones");
	fireEvent.click(screen.getByRole("checkbox", { name: "Smilts (1)" }));
	expect(screen.getByTestId("pdf")).toHaveTextContent("0 zones");
	expect(mockFetch).toHaveBeenCalledTimes(1);
	fireEvent.change(screen.getAllByRole("combobox")[0], {
		target: { value: "2. stāvs" },
	});
	expect(screen.queryByTestId("pdf")).not.toBeInTheDocument();
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
	expect(entries[0]).toHaveTextContent("20.09.2026");
	expect(entries[0]).toHaveTextContent("Earlier work");
	expect(entries[1]).toHaveTextContent("23.09.2026");
	expect(entries[1]).toHaveTextContent("Later work");
});

it("uploads with the selected project/location and runs saved analysis", async () => {
	render(<VisualView siteId="site" />);
	await selectLocation();
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
	fireEvent.change(screen.getAllByRole("combobox")[1], {
		target: { value: "drawing" },
	});
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Nevar atrast darbus",
	);
	expect(screen.getByTestId("pdf")).toHaveTextContent("0 zones");
});

it("rejects non-PDF uploads before calling the server", async () => {
	render(<VisualView siteId="site" />);
	await selectLocation();
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
