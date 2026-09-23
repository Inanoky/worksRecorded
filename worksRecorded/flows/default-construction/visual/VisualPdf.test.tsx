import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { VisualMark } from "./model";
import { VisualPdf } from "./VisualPdf";

const mockGetDocument = jest.fn();
const mockGetPage = jest.fn();
const mockDestroy = jest.fn();
const mockCancel = jest.fn();
jest.mock("pdfjs-dist", () => ({
	GlobalWorkerOptions: { workerSrc: "" },
	getDocument: (...args: unknown[]) => mockGetDocument(...args),
}));
jest.mock("./pdf-worker-url", () => ({ pdfWorkerUrl: "/worker.mjs" }));
const originalFetch = global.fetch;
const mark: VisualMark = {
	id: "mark",
	evidenceId: "photo",
	layer: "xps",
	page: 1,
	confidence: 0.95,
	polygon: [
		{ x: 0.1, y: 0.1 },
		{ x: 0.4, y: 0.1 },
		{ x: 0.4, y: 0.4 },
	],
	anchors: ["A", "B"],
	explanation: "Sakrīt",
};

beforeEach(() => {
	jest.clearAllMocks();
	jest
		.spyOn(HTMLCanvasElement.prototype, "getContext")
		.mockReturnValue({} as CanvasRenderingContext2D);
	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		arrayBuffer: async () => new ArrayBuffer(4),
	});
	mockGetPage.mockResolvedValue({
		getViewport: ({ scale }: { scale: number }) => ({
			width: 100 * scale,
			height: 200 * scale,
		}),
		render: () => ({ promise: Promise.resolve(), cancel: mockCancel }),
	});
	mockGetDocument.mockReturnValue({
		promise: Promise.resolve({ numPages: 2, getPage: mockGetPage }),
		destroy: mockDestroy,
	});
});
afterEach(() => {
	jest.restoreAllMocks();
	global.fetch = originalFetch;
});

it("renders the PDF and normalized overlay on the same surface", async () => {
	const onSelect = jest.fn();
	const { container } = render(
		<VisualPdf
			url="/drawing?pdf=1"
			marks={[mark]}
			selected={null}
			onSelect={onSelect}
		/>,
	);
	await waitFor(() =>
		expect(container.querySelector("polygon")).toBeInTheDocument(),
	);
	expect(container.querySelector("polygon")).toHaveAttribute(
		"points",
		"0.1,0.1 0.4,0.1 0.4,0.4",
	);
	expect(container.querySelector("polygon")).toHaveAttribute("fill", "#eab308");
	fireEvent.click(screen.getByRole("button", { name: "XPS: Sakrīt" }));
	expect(onSelect).toHaveBeenCalledWith("mark");
	fireEvent.click(screen.getByRole("button", { name: "Nākamā lapa" }));
	await waitFor(() => expect(mockGetPage).toHaveBeenLastCalledWith(2));
	expect(container.querySelector("polygon")).not.toBeInTheDocument();
});

it("navigates to the selected source's page and destroys the PDF on unmount", async () => {
	const { rerender, unmount } = render(
		<VisualPdf
			url="/drawing?pdf=1"
			marks={[{ ...mark, page: 2 }]}
			selected={null}
			onSelect={jest.fn()}
		/>,
	);
	await waitFor(() => expect(mockGetPage).toHaveBeenCalledWith(1));
	rerender(
		<VisualPdf
			url="/drawing?pdf=1"
			marks={[{ ...mark, page: 2 }]}
			selected="mark"
			onSelect={jest.fn()}
		/>,
	);
	await waitFor(() => expect(mockGetPage).toHaveBeenLastCalledWith(2));
	unmount();
	expect(mockDestroy).toHaveBeenCalled();
});

it("shows a PDF load error without drawing overlays", async () => {
	jest.mocked(global.fetch).mockResolvedValue({ ok: false } as Response);
	const { container } = render(
		<VisualPdf
			url="/drawing?pdf=1"
			marks={[mark]}
			selected={null}
			onSelect={jest.fn()}
		/>,
	);
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Neizdevās parādīt PDF",
	);
	expect(container.querySelector("polygon")).not.toBeInTheDocument();
});
