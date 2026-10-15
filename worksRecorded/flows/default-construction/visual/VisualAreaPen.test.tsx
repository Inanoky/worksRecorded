import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useRef, useState } from "react";
import { type AreaPenMode, VisualAreaPen } from "./VisualAreaPen";

const originalPointer = window.PointerEvent;
beforeEach(() => {
	window.PointerEvent = class extends MouseEvent {
		pointerId: number;
		constructor(type: string, init: PointerEventInit) {
			super(type, init);
			this.pointerId = init.pointerId ?? 1;
		}
	} as typeof PointerEvent;
	jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
		left: 100,
		top: 50,
		width: 2000,
		height: 1000,
	} as DOMRect);
	HTMLElement.prototype.setPointerCapture = jest.fn();
	HTMLElement.prototype.hasPointerCapture = jest.fn().mockReturnValue(true);
	HTMLElement.prototype.releasePointerCapture = jest.fn();
});
afterEach(() => {
	jest.restoreAllMocks();
	window.PointerEvent = originalPointer;
});

function Harness({
	mode = "polygon",
	onComplete = jest.fn(),
	onCancel = jest.fn(),
}: {
	mode?: AreaPenMode;
	onComplete?: jest.Mock;
	onCancel?: jest.Mock;
}) {
	const surface = useRef<HTMLDivElement>(null);
	const viewport = useRef<HTMLElement>(null);
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	return (
		<section ref={viewport}>
			<div ref={surface}>
				{mounted ? (
					<VisualAreaPen
						mode={mode}
						surface={surface}
						viewport={viewport}
						color="#16a34a"
						onComplete={onComplete}
						onCancel={onCancel}
					/>
				) : null}
			</div>
		</section>
	);
}
function click(x: number, y: number) {
	fireEvent.click(screen.getByRole("application"), {
		clientX: 100 + x * 2000,
		clientY: 50 + y * 1000,
		detail: 1,
	});
}

it("places normalized corners on a zoomed surface and closes at the first point without persisting automatically", () => {
	const onComplete = jest.fn();
	render(<Harness onComplete={onComplete} />);
	click(0.1, 0.1);
	click(0.8, 0.1);
	click(0.8, 0.8);
	expect(onComplete).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Aizvērt zonu" }));
	expect(onComplete).toHaveBeenCalledWith([
		{ x: 0.1, y: 0.1 },
		{ x: 0.8, y: 0.1 },
		{ x: 0.8, y: 0.8 },
	]);
});
it("finishes with double-click, ignores duplicate second clicks, and supports undo and Escape", () => {
	const onComplete = jest.fn(),
		onCancel = jest.fn();
	render(<Harness onComplete={onComplete} onCancel={onCancel} />);
	click(0.1, 0.1);
	click(0.8, 0.1);
	click(0.8, 0.8);
	click(0.4, 0.9);
	fireEvent.keyDown(window, { key: "Backspace" });
	fireEvent.click(screen.getByRole("application"), {
		clientX: 1700,
		clientY: 850,
		detail: 2,
	});
	fireEvent.doubleClick(screen.getByRole("application"));
	expect(onComplete.mock.calls[0][0]).toHaveLength(3);
	fireEvent.keyDown(window, { key: "Escape" });
	expect(onCancel).toHaveBeenCalledTimes(1);
});
it("rejects intersecting outlines and does not turn Shift-pan gestures into corners", () => {
	const onComplete = jest.fn();
	render(<Harness onComplete={onComplete} />);
	fireEvent.click(screen.getByRole("application"), {
		shiftKey: true,
		clientX: 400,
		clientY: 400,
	});
	expect(
		screen.getByRole("button", { name: "Pabeigt kontūru" }),
	).toBeDisabled();
	click(0.1, 0.1);
	click(0.8, 0.8);
	click(0.8, 0.1);
	click(0.1, 0.8);
	fireEvent.click(screen.getByRole("button", { name: "Pabeigt kontūru" }));
	expect(screen.getByRole("alert")).toHaveTextContent("nekrustojošas");
	expect(onComplete).not.toHaveBeenCalled();
});
it("captures a freehand stylus outline and converts it to an editable polygon on release", () => {
	const onComplete = jest.fn();
	render(<Harness mode="freehand" onComplete={onComplete} />);
	const pen = screen.getByRole("application");
	fireEvent.pointerDown(pen, {
		button: 0,
		pointerId: 7,
		pointerType: "pen",
		clientX: 300,
		clientY: 150,
	});
	fireEvent.pointerMove(pen, { pointerId: 7, clientX: 1700, clientY: 150 });
	fireEvent.pointerMove(pen, { pointerId: 7, clientX: 1700, clientY: 850 });
	fireEvent.pointerMove(pen, { pointerId: 7, clientX: 300, clientY: 850 });
	fireEvent.pointerUp(pen, { pointerId: 7, clientX: 300, clientY: 150 });
	expect(onComplete).toHaveBeenCalledTimes(1);
	expect(onComplete.mock.calls[0][0]).toHaveLength(4);
});
it("ignores editing shortcuts while typing into another panel and cancels interrupted strokes", () => {
	const onComplete = jest.fn(),
		onCancel = jest.fn();
	render(
		<>
			<input aria-label="Comments" />
			<Harness mode="freehand" onComplete={onComplete} onCancel={onCancel} />
		</>,
	);
	fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
	expect(onCancel).not.toHaveBeenCalled();
	const pen = screen.getByRole("application");
	fireEvent.pointerDown(pen, {
		button: 0,
		pointerId: 7,
		clientX: 300,
		clientY: 150,
	});
	fireEvent.pointerCancel(pen, { pointerId: 7 });
	fireEvent.pointerUp(pen, { pointerId: 7, clientX: 1700, clientY: 850 });
	expect(onComplete).not.toHaveBeenCalled();
});
