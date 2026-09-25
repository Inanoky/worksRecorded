import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DefaultConstructionForma2PdfPreview } from "./DefaultConstructionForma2PdfPreview";

const mockGetDocument = jest.fn();
const mockGetPage = jest.fn();
const mockDestroy = jest.fn();
const mockCancel = jest.fn();
jest.mock("pdfjs-dist", () => ({
	GlobalWorkerOptions: { workerSrc: "" },
	getDocument: (...args: unknown[]) => mockGetDocument(...args),
}));
jest.mock("../visual/pdf-worker-url", () => ({ pdfWorkerUrl: "/worker.mjs" }));
const originalFetch = global.fetch;
beforeEach(() => {
	jest.clearAllMocks();
	jest
		.spyOn(HTMLCanvasElement.prototype, "getContext")
		.mockReturnValue({} as CanvasRenderingContext2D);
	global.fetch = jest
		.fn()
		.mockResolvedValue({
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

it("fits the invoice to the panel without an embedded browser viewer", async () => {
	const { container } = render(
		<DefaultConstructionForma2PdfPreview
			url="/invoice"
			title="INV-1"
			isLatvian={false}
		/>,
	);
	await waitFor(() =>
		expect(screen.queryByRole("status")).not.toBeInTheDocument(),
	);
	const canvas = screen.getByRole("img", { name: "INV-1" });
	expect(canvas).toHaveClass("w-full", "h-auto");
	expect(canvas.parentElement).toHaveStyle({ width: "100%" });
	expect(container.querySelector("iframe")).toBeNull();
	fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
	expect(canvas.parentElement).toHaveStyle({ width: "125%" });
	fireEvent.click(screen.getByTitle("Fit to width"));
	expect(canvas.parentElement).toHaveStyle({ width: "100%" });
	expect(global.fetch).toHaveBeenCalledTimes(1);
});

it("changes pages and releases PDF resources when closed", async () => {
	const { unmount } = render(
		<DefaultConstructionForma2PdfPreview
			url="/invoice"
			title="INV-1"
			isLatvian={false}
		/>,
	);
	await waitFor(() =>
		expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled(),
	);
	fireEvent.click(screen.getByRole("button", { name: "Next page" }));
	await waitFor(() => expect(mockGetPage).toHaveBeenLastCalledWith(2));
	expect(screen.getByText("2 / 2")).toBeInTheDocument();
	expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
	unmount();
	expect(mockDestroy).toHaveBeenCalled();
	expect(mockCancel).toHaveBeenCalled();
});

it("shows an actionable error if the invoice cannot be downloaded", async () => {
	jest.mocked(global.fetch).mockResolvedValue({ ok: false } as Response);
	render(
		<DefaultConstructionForma2PdfPreview
			url="/missing"
			title="INV-1"
			isLatvian
		/>,
	);
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"PDF neizdevās ielādēt",
	);
	expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
