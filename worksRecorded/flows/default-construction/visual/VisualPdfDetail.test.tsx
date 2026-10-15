import { act, render, waitFor } from "@testing-library/react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { VisualPdfDetail } from "./VisualPdfDetail";

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
		.mockReturnValue({} as CanvasRenderingContext2D);
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
	const { container, rerender } = render(
		<VisualPdfDetail
			{...props}
			overviewWidth={3600}
			view={{ ...view, camera: { x: 0, y: 0, scale: 1 } }}
		/>,
	);
	expect(getPage).not.toHaveBeenCalled();
	rerender(<VisualPdfDetail {...props} overviewWidth={3600} />);
	await waitFor(() => expect(container.querySelector("canvas")).not.toBeNull());
});

it("renders a bounded visible crop at zoom/device resolution and frees the bitmap on unmount", async () => {
	const { container, unmount } = render(<VisualPdfDetail {...props} />);
	await waitFor(() => expect(container.querySelector("canvas")).not.toBeNull());
	expect(renderPdf.mock.calls[0][0].transform).toEqual([
		1, 0, 0, 1, -3440, -1640,
	]);
	const canvas = container.querySelector("canvas");
	if (!canvas) throw new Error("No detail canvas");
	expect(canvas).toBe(renderPdf.mock.calls[0][0].canvas);
	expect(canvas.width).toBe(2320);
	expect(canvas.height).toBe(1720);
	expect(canvas).toHaveStyle({
		left: `${(344 / 1200) * 100}%`,
		top: "20.5%",
		width: `${(232 / 1200) * 100}%`,
		height: "21.5%",
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
	await waitFor(() => expect(container.querySelector("canvas")).not.toBeNull());
	expect(cancel).toHaveBeenCalled();
	const current = container.querySelector("canvas");
	await act(async () => finishOld());
	expect(container.querySelector("canvas")).toBe(current);
	expect(current).toHaveStyle({ left: "32%" });
	expect(renderPdf.mock.calls[0][0].canvas.width).toBe(0);
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
	expect(container.querySelector("canvas")).toBeNull();
});

it("keeps the displayed bitmap untouched until a fully positioned replacement is ready", async () => {
	const { container, rerender } = render(<VisualPdfDetail {...props} />);
	await waitFor(() => expect(container.querySelector("canvas")).not.toBeNull());
	const first = container.querySelector("canvas");
	if (!first) throw new Error("No initial canvas");
	const initialWidth = first.width;
	const initialHeight = first.height;
	const initialStyle = first.getAttribute("style");
	let finish: () => void = () => {};
	renderPdf.mockReturnValueOnce({
		promise: new Promise<void>((resolve) => {
			finish = resolve;
		}),
		cancel,
	});
	rerender(
		<VisualPdfDetail
			{...props}
			view={{ ...view, camera: { ...view.camera, x: -2000 } }}
		/>,
	);
	await waitFor(() => expect(renderPdf).toHaveBeenCalledTimes(2));
	expect(container.querySelector("canvas")).toBe(first);
	expect(first.width).toBe(initialWidth);
	expect(first.height).toBe(initialHeight);
	expect(first.getAttribute("style")).toBe(initialStyle);
	const host = container.querySelector("[data-pdf-detail-layer]");
	if (!host) throw new Error("No detail host");
	const replace = host.replaceChildren.bind(host);
	const swap = jest
		.spyOn(host, "replaceChildren")
		.mockImplementation((...nodes) => {
			const next = nodes[0] as HTMLCanvasElement;
			expect(next).toHaveStyle({ left: "32%", top: "20.5%" });
			expect(next.width).toBeGreaterThan(0);
			expect(first.width).toBe(initialWidth);
			replace(...nodes);
		});
	await act(async () => finish());
	expect(swap).toHaveBeenCalledTimes(1);
	expect(container.querySelectorAll("canvas")).toHaveLength(1);
	expect(container.querySelector("canvas")).not.toBe(first);
	expect(first.width).toBe(0);
	expect(first.height).toBe(0);
});

it("retains the last good detail on cancellation and rendering failure", async () => {
	const { container, rerender } = render(<VisualPdfDetail {...props} />);
	await waitFor(() => expect(container.querySelector("canvas")).not.toBeNull());
	const first = container.querySelector("canvas");
	const initialStyle = first?.getAttribute("style");
	rerender(<VisualPdfDetail {...props} enabled={false} />);
	expect(container.querySelector("canvas")).toBe(first);
	renderPdf.mockImplementationOnce(() => {
		throw new Error("Rendering failed");
	});
	rerender(
		<VisualPdfDetail
			{...props}
			view={{ ...view, camera: { ...view.camera, x: -2000 } }}
		/>,
	);
	await waitFor(() => expect(renderPdf).toHaveBeenCalledTimes(2));
	expect(container.querySelector("canvas")).toBe(first);
	expect(first?.getAttribute("style")).toBe(initialStyle);
	expect(first?.width).toBeGreaterThan(0);
});
