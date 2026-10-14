import { act, fireEvent, render, screen } from "@testing-library/react";
import { InvoicePreviewViewport } from "./InvoicePreviewViewport";

function setup(ready = true) {
	const result = render(
		<InvoicePreviewViewport ready={ready} isLatvian={false}>
			<span>Invoice</span>
		</InvoicePreviewViewport>,
	);
	const viewport = screen.getByRole("region", { name: "Invoice zoom and pan" });
	const content = screen.getByText("Invoice").parentElement as HTMLElement;
	Object.defineProperties(viewport, {
		clientWidth: { value: 600 },
		clientHeight: { value: 400 },
	});
	jest
		.spyOn(viewport, "getBoundingClientRect")
		.mockImplementation(
			() => ({ left: 100, top: 50, width: 600, height: 400 }) as DOMRect,
		);
	jest.spyOn(content, "getBoundingClientRect").mockImplementation(
		() =>
			({
				left: 112 - viewport.scrollLeft,
				top: 62 - viewport.scrollTop,
			}) as DOMRect,
	);
	return { ...result, viewport, content };
}

afterEach(() => jest.restoreAllMocks());

it("zooms around the pointer without scrolling the containing dialog", () => {
	const { viewport, content } = setup();
	viewport.scrollLeft = 120;
	viewport.scrollTop = 240;
	expect(
		fireEvent.wheel(viewport, { deltaY: -100, clientX: 400, clientY: 200 }),
	).toBe(false);
	const scale = Math.exp(0.2);
	expect(Number.parseFloat(content.style.width)).toBeCloseTo(scale * 100);
	expect(viewport.scrollLeft).toBeCloseTo(120 + 408 * (scale - 1));
	expect(viewport.scrollTop).toBeCloseTo(240 + 378 * (scale - 1));
	const point = (viewport.scrollLeft + 400 - 112) / scale;
	fireEvent.wheel(viewport, { deltaY: -100, clientX: 400, clientY: 200 });
	expect((viewport.scrollLeft + 400 - 112) / (scale * scale)).toBeCloseTo(
		point,
	);
});

it("limits zoom to 100–300% and resets both scroll axes", () => {
	const { viewport, content } = setup();
	for (let index = 0; index < 10; index++)
		fireEvent.wheel(viewport, { deltaY: -1000 });
	expect(content).toHaveStyle({ width: "300%" });
	expect(screen.getByRole("button", { name: "Zoom in" })).toBeDisabled();
	viewport.scrollLeft = 150;
	viewport.scrollTop = 300;
	fireEvent.click(screen.getByTitle("Fit to width"));
	expect(content).toHaveStyle({ width: "100%" });
	expect(viewport.scrollLeft).toBe(0);
	expect(viewport.scrollTop).toBe(0);
	fireEvent.wheel(viewport, { deltaY: 100 });
	expect(content).toHaveStyle({ width: "100%" });
});

it("keeps the pointer anchor when several wheel events arrive before a render", () => {
	const { viewport } = setup();
	viewport.scrollLeft = 120;
	viewport.scrollTop = 240;
	act(() => {
		fireEvent.wheel(viewport, { deltaY: -100, clientX: 400, clientY: 200 });
		fireEvent.wheel(viewport, { deltaY: -100, clientX: 400, clientY: 200 });
	});
	expect(viewport.scrollLeft).toBeCloseTo(120 + 408 * (Math.exp(0.4) - 1));
	expect(viewport.scrollTop).toBeCloseTo(240 + 378 * (Math.exp(0.4) - 1));
});

it("normalizes line-based wheel deltas", () => {
	const { viewport, content } = setup();
	fireEvent.wheel(viewport, { deltaMode: 1, deltaY: -3 });
	expect(Number.parseFloat(content.style.width)).toBeCloseTo(
		Math.exp(0.096) * 100,
	);
});

it("does not intercept wheel events or enable zoom before loading", () => {
	const { viewport, content } = setup(false);
	expect(fireEvent.wheel(viewport, { deltaY: -100 })).toBe(true);
	expect(content).toHaveStyle({ width: "100%" });
	expect(screen.getByRole("button", { name: "Zoom in" })).toBeDisabled();
});

it("removes its non-passive wheel listener on unmount", () => {
	const { viewport, unmount } = setup();
	const remove = jest.spyOn(viewport, "removeEventListener");
	unmount();
	expect(remove).toHaveBeenCalledWith("wheel", expect.any(Function));
});

it("pans with pointer capture and stops on cancellation or pointer release", () => {
	const original = window.PointerEvent;
	window.PointerEvent = MouseEvent as typeof PointerEvent;
	try {
		const { viewport, content } = setup();
		viewport.scrollLeft = 200;
		viewport.scrollTop = 300;
		viewport.setPointerCapture = jest.fn();
		viewport.hasPointerCapture = jest.fn().mockReturnValue(true);
		viewport.releasePointerCapture = jest.fn();
		fireEvent.pointerDown(viewport, { button: 0, clientX: 400, clientY: 300 });
		expect(viewport).toHaveClass("cursor-grabbing");
		expect(viewport.setPointerCapture).toHaveBeenCalled();
		fireEvent.pointerMove(viewport, { clientX: 350, clientY: 225 });
		expect(viewport.scrollLeft).toBe(250);
		expect(viewport.scrollTop).toBe(375);
		expect(content).toHaveStyle({ width: "100%" });
		fireEvent.pointerCancel(viewport);
		expect(viewport).toHaveClass("cursor-grab");
		expect(viewport.releasePointerCapture).toHaveBeenCalled();
		fireEvent.pointerMove(viewport, { clientX: 100, clientY: 100 });
		expect(viewport.scrollLeft).toBe(250);
		fireEvent.pointerDown(viewport, { button: 2, clientX: 400, clientY: 300 });
		expect(viewport).not.toHaveClass("cursor-grabbing");
		fireEvent.pointerDown(viewport, { button: 0, clientX: 400, clientY: 300 });
		fireEvent.pointerUp(viewport);
		expect(viewport).not.toHaveClass("cursor-grabbing");
	} finally {
		window.PointerEvent = original;
	}
});
