import { act, fireEvent, render, screen } from "@testing-library/react";
import { TgemImageViewer } from "./TgemImageViewer";

const props = {
	documentPath: "/api/tgem/invoices/case-1/documents/document-1",
	filename: "invoice.png",
	language: "en",
};

async function loadImage(width = 1200, height = 1600) {
	const image = screen.getByRole("img", { name: props.filename });
	Object.defineProperties(image, {
		naturalWidth: { configurable: true, value: width },
		naturalHeight: { configurable: true, value: height },
	});
	await act(async () => {
		fireEvent.load(image);
	});
	return image;
}

describe("TgemImageViewer", () => {
	beforeEach(() => {
		jest
			.spyOn(HTMLElement.prototype, "clientWidth", "get")
			.mockReturnValue(800);
		jest
			.spyOn(HTMLElement.prototype, "clientHeight", "get")
			.mockReturnValue(432);
		Object.defineProperty(globalThis, "ResizeObserver", {
			configurable: true,
			value: undefined,
		});
		Object.defineProperty(globalThis, "PointerEvent", {
			configurable: true,
			value: class extends MouseEvent {
				pointerId: number;
				isPrimary: boolean;
				constructor(type: string, options: PointerEventInit = {}) {
					super(type, options);
					this.pointerId = options.pointerId ?? 1;
					this.isPrimary = options.isPrimary ?? true;
				}
			},
		});
	});

	afterEach(() => jest.restoreAllMocks());

	it("fits actual image dimensions, zooms, and returns to fit without clipping", async () => {
		render(<TgemImageViewer {...props} />);
		const image = await loadImage();
		expect(image).toHaveStyle({ width: "300px", height: "400px" });
		expect(image).toHaveAttribute("draggable", "false");
		expect(screen.getByText("25%")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
		expect(image).toHaveStyle({ width: "375px", height: "500px" });
		fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
		expect(image).toHaveStyle({ width: "300px", height: "400px" });

		const viewport = screen.getByTestId("tgem-image-viewport");
		viewport.scrollLeft = 120;
		viewport.scrollTop = 200;
		fireEvent.click(screen.getByRole("button", { name: "Fit image" }));
		expect(viewport.scrollLeft).toBe(0);
		expect(viewport.scrollTop).toBe(0);
		expect(screen.getByRole("link", { name: "Download" })).toHaveAttribute(
			"href",
			props.documentPath,
		);
		expect(
			screen.getByRole("link", { name: "Open in new tab" }),
		).toHaveAttribute("href", props.documentPath);
	});

	it("fits landscape scans using their actual aspect ratio and follows viewport resizing", async () => {
		render(<TgemImageViewer {...props} />);
		const image = await loadImage(1600, 800);
		expect(image).toHaveStyle({ width: "768px", height: "384px" });
		Object.defineProperty(
			screen.getByTestId("tgem-image-viewport"),
			"clientWidth",
			{ configurable: true, value: 400 },
		);
		act(() => window.dispatchEvent(new Event("resize")));
		expect(image).toHaveStyle({ width: "368px", height: "184px" });
	});

	it.each(["mouse", "pen", "touch"])(
		"pans in both directions with %s and releases capture on cancellation",
		async (pointerType) => {
			render(<TgemImageViewer {...props} />);
			await loadImage();
			const viewport = screen.getByTestId("tgem-image-viewport");
			const capture = jest.fn();
			const release = jest.fn();
			Object.defineProperties(viewport, {
				scrollWidth: { configurable: true, value: 1600 },
				scrollHeight: { configurable: true, value: 2000 },
				setPointerCapture: { configurable: true, value: capture },
				hasPointerCapture: { configurable: true, value: () => true },
				releasePointerCapture: { configurable: true, value: release },
			});
			viewport.scrollLeft = 100;
			viewport.scrollTop = 200;
			fireEvent.pointerDown(viewport, {
				button: 0,
				pointerId: 7,
				pointerType,
				clientX: 300,
				clientY: 300,
			});
			fireEvent.pointerMove(viewport, { pointerId: 8, clientX: 0, clientY: 0 });
			expect(viewport.scrollLeft).toBe(100);
			fireEvent.pointerMove(viewport, {
				pointerId: 7,
				clientX: 250,
				clientY: 225,
			});
			expect(viewport.scrollLeft).toBe(150);
			expect(viewport.scrollTop).toBe(275);
			expect(capture).toHaveBeenCalledWith(7);
			expect(viewport).toHaveClass("cursor-grabbing", "touch-none");
			fireEvent.pointerCancel(viewport, { pointerId: 7 });
			expect(release).toHaveBeenCalledWith(7);
			expect(viewport).toHaveClass("cursor-grab");
			fireEvent.pointerMove(viewport, { pointerId: 7, clientX: 0, clientY: 0 });
			expect(viewport.scrollLeft).toBe(150);
		},
	);

	it("does not capture a fitting image or a right-click", async () => {
		render(<TgemImageViewer {...props} />);
		await loadImage();
		const viewport = screen.getByTestId("tgem-image-viewport");
		const capture = jest.fn();
		Object.defineProperty(viewport, "setPointerCapture", {
			configurable: true,
			value: capture,
		});
		fireEvent.pointerDown(viewport, { button: 0 });
		Object.defineProperty(viewport, "scrollWidth", {
			configurable: true,
			value: 1600,
		});
		fireEvent.pointerDown(viewport, { button: 2 });
		expect(capture).not.toHaveBeenCalled();
	});

	it("allows retrying a failed image in Latvian", async () => {
		render(<TgemImageViewer {...props} language="lv" />);
		expect(screen.getByRole("status")).toHaveTextContent("Ielādē attēlu");
		fireEvent.error(screen.getByRole("img", { name: props.filename }));
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Attēlu neizdevās ielādēt",
		);
		fireEvent.click(screen.getByRole("button", { name: "Mēģināt vēlreiz" }));
		await loadImage();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Palielināt" })).toBeEnabled();
	});
});
