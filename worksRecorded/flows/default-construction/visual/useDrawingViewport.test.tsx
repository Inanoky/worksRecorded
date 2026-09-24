import { act, fireEvent, render, screen } from "@testing-library/react";
import { useDrawingViewport } from "./useDrawingViewport";

function Harness({ enabled = true }: { enabled?: boolean }) {
	const view = useDrawingViewport(2, "drawing:1", enabled);
	return (
		<>
			<section data-testid="viewport" ref={view.viewport}>
				<div data-testid="surface" ref={view.surface} />
			</section>
			<output ref={view.scaleLabel} aria-label="scale">
				100%
			</output>
			<button type="button" onClick={() => view.zoomAt(1.25)}>
				Zoom
			</button>
			<button type="button" onClick={view.reset}>
				Fit
			</button>
		</>
	);
}

let frames: Map<number, FrameRequestCallback>;
let now: number;
let nextId: number;
beforeEach(() => {
	frames = new Map();
	now = 0;
	nextId = 0;
	jest.spyOn(performance, "now").mockImplementation(() => now);
	jest.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
		frames.set(++nextId, callback);
		return nextId;
	});
	jest.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
		frames.delete(id);
	});
	jest.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1000);
	jest.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(600);
	jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
		left: 50,
		top: 80,
		width: 1000,
		height: 600,
	} as DOMRect);
});
afterEach(() => jest.restoreAllMocks());

function advance(ms: number) {
	now += ms;
	act(() => {
		const batch = [...frames.values()];
		frames.clear();
		for (const tick of batch) tick(now);
	});
}
function camera() {
	const match = screen
		.getByTestId("surface")
		.style.transform.match(
			/translate3d\(([^p]+)px, ([^p]+)px, 0\) scale\(([^)]+)\)/,
		);
	if (!match) throw new Error("No camera transform");
	return { x: Number(match[1]), y: Number(match[2]), scale: Number(match[3]) };
}

it("animates wheel zoom around the local cursor coordinate and cancels outstanding frames on unmount", () => {
	const { unmount } = render(<Harness />);
	const before = camera();
	const anchor = { x: 700, y: 240 };
	const world = {
		x: (anchor.x - before.x) / before.scale,
		y: (anchor.y - before.y) / before.scale,
	};
	fireEvent.wheel(screen.getByTestId("viewport"), {
		deltaY: -100,
		clientX: 750,
		clientY: 320,
	});
	expect(camera()).toEqual(before);
	advance(60);
	const halfway = camera();
	expect(halfway.scale).toBeGreaterThan(1);
	expect(halfway.scale).toBeLessThan(Math.exp(0.2));
	expect(halfway.x + world.x * halfway.scale).toBeCloseTo(anchor.x);
	expect(halfway.y + world.y * halfway.scale).toBeCloseTo(anchor.y);
	advance(120);
	expect(camera().scale).toBeCloseTo(Math.exp(0.2));
	fireEvent.click(screen.getByRole("button", { name: "Zoom" }));
	expect(frames.size).toBe(1);
	unmount();
	expect(frames.size).toBe(0);
});

it("accumulates fast wheel input and reverses smoothly without losing its anchor", () => {
	render(<Harness />);
	const viewport = screen.getByTestId("viewport");
	fireEvent.wheel(viewport, { deltaY: -50, clientX: 550, clientY: 380 });
	fireEvent.wheel(viewport, { deltaY: -50, clientX: 550, clientY: 380 });
	advance(180);
	expect(camera().scale).toBeCloseTo(Math.exp(0.2));
	fireEvent.wheel(viewport, { deltaY: 100, clientX: 550, clientY: 380 });
	advance(180);
	expect(camera().scale).toBeCloseTo(1);
	fireEvent.click(screen.getByRole("button", { name: "Fit" }));
	advance(180);
	expect(camera()).toEqual({ x: 24, y: 62, scale: 1 });
});

it("clamps repeated wheel zoom-out to 100% without moving the fitted drawing", () => {
	render(<Harness />);
	const before = camera();
	for (let index = 0; index < 10; index++) {
		fireEvent.wheel(screen.getByTestId("viewport"), {
			deltaY: 100,
			clientX: 750,
			clientY: 320,
		});
		advance(180);
		expect(camera()).toEqual(before);
	}
	expect(screen.getByLabelText("scale")).toHaveTextContent("100%");
});

it("does not intercept wheel input while corner editing disables navigation", () => {
	render(<Harness enabled={false} />);
	const before = camera();
	fireEvent.wheel(screen.getByTestId("viewport"), { deltaY: -100 });
	expect(frames.size).toBe(0);
	expect(camera()).toEqual(before);
});

it("preserves the drawing center when the sidebar changes the viewport size", () => {
	render(<Harness />);
	fireEvent.click(screen.getByRole("button", { name: "Zoom" }));
	advance(180);
	const before = camera();
	const fraction = (500 - before.x) / (952 * before.scale);
	jest.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(700);
	fireEvent(window, new Event("resize"));
	expect((350 - camera().x) / (652 * camera().scale)).toBeCloseTo(fraction);
});

it("pans without changing scale and does not pan from a simple click", () => {
	const original = window.PointerEvent;
	window.PointerEvent = MouseEvent as typeof PointerEvent;
	try {
		render(<Harness />);
		const viewport = screen.getByTestId("viewport");
		viewport.setPointerCapture = jest.fn();
		const before = camera();
		fireEvent.pointerDown(viewport, { button: 0, clientX: 300, clientY: 250 });
		fireEvent.pointerMove(viewport, { clientX: 302, clientY: 251 });
		expect(camera()).toEqual(before);
		fireEvent.pointerMove(viewport, { clientX: 400, clientY: 300 });
		expect(camera()).toEqual({
			...before,
			x: before.x + 100,
			y: before.y + 50,
		});
		fireEvent.pointerUp(window);
		fireEvent.pointerMove(viewport, { clientX: 500, clientY: 400 });
		expect(camera().x).toBe(before.x + 100);
	} finally {
		window.PointerEvent = original;
	}
});

it("honors reduced-motion preferences", () => {
	const previous = window.matchMedia;
	window.matchMedia = jest.fn().mockReturnValue({ matches: true });
	try {
		render(<Harness />);
		fireEvent.click(screen.getByRole("button", { name: "Zoom" }));
		expect(camera().scale).toBe(1.25);
		expect(frames.size).toBe(0);
	} finally {
		window.matchMedia = previous;
	}
});
