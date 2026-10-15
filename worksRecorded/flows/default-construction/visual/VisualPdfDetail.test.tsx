import { act, render, waitFor } from "@testing-library/react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { VisualPdfDetail } from "./VisualPdfDetail";

const drawImage = jest.fn();
const cancel = jest.fn();
const renderPdf = jest.fn();
const getPage = jest.fn();
const document = { getPage } as unknown as PDFDocumentProxy;
const view = {
	camera: { x: -1800, y: -900, scale: 5 },
	width: 1000,
	height: 700,
};
beforeEach(() => {
	jest.resetAllMocks();
	jest.replaceProperty(window, "devicePixelRatio", 2);
	jest
		.spyOn(HTMLCanvasElement.prototype, "getContext")
		.mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
	renderPdf.mockReturnValue({ promise: Promise.resolve(), cancel });
	getPage.mockResolvedValue({
		getViewport: ({ scale }: { scale: number }) => ({
			width: 100 * scale,
			height: (100 * scale) / 1.5,
		}),
		render: renderPdf,
	});
});
afterEach(() => jest.restoreAllMocks());
const props = {
	document,
	page: 1,
	pageWidth: 1200,
	pageHeight: 800,
	view,
	enabled: true,
};

it("keeps the sharper overview instead of replacing it with a lower-density detail crop", async () => {
	const { rerender } = render(
		<VisualPdfDetail
			{...props}
			overviewWidth={3600}
			view={{ ...view, camera: { x: 0, y: 0, scale: 1 } }}
		/>,
	);
	expect(getPage).not.toHaveBeenCalled();
	rerender(<VisualPdfDetail {...props} overviewWidth={3600} />);
	await waitFor(() => expect(drawImage).toHaveBeenCalledTimes(1));
});

it("renders a bounded visible crop at zoom/device resolution and frees the bitmap on unmount", async () => {
	const { container, unmount } = render(<VisualPdfDetail {...props} />);
	await waitFor(() => expect(drawImage).toHaveBeenCalledTimes(1));
	expect(renderPdf.mock.calls[0][0].transform).toEqual([
		1, 0, 0, 1, -3440, -1640,
	]);
	const canvas = container.querySelector("canvas");
	if (!canvas) throw new Error("No detail canvas");
	expect(canvas.width).toBe(2320);
	expect(canvas.height).toBe(1720);
	expect(canvas).toHaveStyle({
		left: "344px",
		top: "164px",
		width: "232px",
		height: "172px",
	});
	unmount();
	expect(canvas.width).toBe(0);
	expect(canvas.height).toBe(0);
});
it("cancels obsolete work and never lets a late render replace the newest crop", async () => {
	let finishOld!: () => void;
	renderPdf.mockReturnValueOnce({
		promise: new Promise<void>((resolve) => {
			finishOld = resolve;
		}),
		cancel,
	});
	const { container, rerender } = render(<VisualPdfDetail {...props} />);
	await waitFor(() => expect(renderPdf).toHaveBeenCalledTimes(1));
	rerender(
		<VisualPdfDetail
			{...props}
			view={{ ...view, camera: { ...view.camera, x: -2000 } }}
		/>,
	);
	await waitFor(() => expect(drawImage).toHaveBeenCalledTimes(1));
	expect(cancel).toHaveBeenCalled();
	await act(async () => finishOld());
	expect(drawImage).toHaveBeenCalledTimes(1);
	expect(container.querySelector("canvas")).toHaveStyle({ left: "384px" });
});
it("does no work while panning or hidden and preserves the overview if high-detail rendering fails", async () => {
	const { container, rerender } = render(
		<VisualPdfDetail {...props} enabled={false} />,
	);
	expect(getPage).not.toHaveBeenCalled();
	renderPdf.mockReturnValue({
		promise: Promise.reject(new Error("Render failed")),
		cancel,
	});
	rerender(<VisualPdfDetail {...props} />);
	await waitFor(() => expect(renderPdf).toHaveBeenCalled());
	expect(drawImage).not.toHaveBeenCalled();
	expect(container.querySelector("canvas")).toHaveStyle({ display: "none" });
});
