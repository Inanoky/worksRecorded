import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { getVisualDrawings } from "./actions";
import type { VisualDrawing } from "./model";
import VisualView from "./VisualView";

const mockUpload = jest.fn();
jest.mock("@/lib/utils/UploadthingsComponents", () => ({
	useUploadThing: () => ({ startUpload: mockUpload }),
}));
jest.mock("./actions", () => ({
	getVisualDrawings: jest.fn(),
	refreshVisualDrawing: jest.fn(),
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
	await waitFor(() =>
		expect(mockFetch).toHaveBeenCalledWith("/api/sites/site/visual/drawing", {
			method: "POST",
		}),
	);
	expect(mockUpload).toHaveBeenCalledWith([file], {
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
	expect(await screen.findByRole("alert")).toHaveTextContent("Izvēlieties PDF");
	expect(mockUpload).not.toHaveBeenCalled();
});
