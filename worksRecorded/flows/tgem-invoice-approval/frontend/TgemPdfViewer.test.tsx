import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { TgemPdfViewer } from "./TgemPdfViewer";

const mockGetDocument = jest.fn();
const mockGetPage = jest.fn();
const mockRender = jest.fn();
const mockGetTextContent = jest.fn();
const mockTextLayerConstructor = jest.fn();
const mockTextLayerRender = jest.fn();
const mockTextLayerCancel = jest.fn();
const mockDocumentDestroy = jest.fn();
const mockFetch = jest.fn();

jest.mock("pdfjs-dist", () => ({
	GlobalWorkerOptions: { workerSrc: "" },
	getDocument: (...args: unknown[]) => mockGetDocument(...args),
	TextLayer: class {
		constructor(options: unknown) {
			mockTextLayerConstructor(options);
		}

		render() {
			return mockTextLayerRender();
		}

		cancel() {
			mockTextLayerCancel();
		}
	},
}));

jest.mock("./pdf-worker-url", () => ({
	pdfWorkerUrl: "/pdf.worker.min.mjs",
}));

describe("TgemPdfViewer", () => {
	let clientWidthSpy: jest.SpyInstance;
	let canvasContextSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		clientWidthSpy = jest
			.spyOn(HTMLElement.prototype, "clientWidth", "get")
			.mockReturnValue(800);
		canvasContextSpy = jest
			.spyOn(HTMLCanvasElement.prototype, "getContext")
			.mockReturnValue({} as CanvasRenderingContext2D);

		Object.defineProperty(globalThis, "ResizeObserver", {
			configurable: true,
			value: class {
				observe() {}
				disconnect() {}
			},
		});
		Object.defineProperty(globalThis, "PointerEvent", {
			configurable: true,
			value: class extends MouseEvent {
				pointerId: number;

				constructor(type: string, options: PointerEventInit = {}) {
					super(type, options);
					this.pointerId = options.pointerId ?? 1;
				}
			},
		});

		mockRender.mockReturnValue({
			promise: Promise.resolve(),
			cancel: jest.fn(),
		});
		mockGetTextContent.mockResolvedValue({
			items: [{ str: "Invoice number TG-2026-0718" }],
			styles: {},
		});
		mockTextLayerRender.mockResolvedValue(undefined);
		mockGetPage.mockResolvedValue({
			getViewport: ({ scale }: { scale: number }) => ({
				width: 600 * scale,
				height: 800 * scale,
			}),
			render: (...args: unknown[]) => mockRender(...args),
			getTextContent: (...args: unknown[]) => mockGetTextContent(...args),
		});
		mockGetDocument.mockReturnValue({
			promise: Promise.resolve({
				numPages: 2,
				getPage: (...args: unknown[]) => mockGetPage(...args),
				destroy: mockDocumentDestroy,
			}),
			destroy: jest.fn(),
		});
		Object.defineProperty(globalThis, "fetch", {
			configurable: true,
			value: mockFetch,
		});
		mockFetch.mockResolvedValue({
			ok: true,
			arrayBuffer: async () => new ArrayBuffer(16),
		} as Response);
	});

	afterEach(() => {
		clientWidthSpy.mockRestore();
		canvasContextSpy.mockRestore();
		jest.restoreAllMocks();
	});

	it("renders authenticated PDF bytes with review controls", async () => {
		render(
			<TgemPdfViewer
				documentPath="/api/tgem/invoices/case-1/documents/document-1"
				filename="invoice.pdf"
				language="en"
			/>,
		);

		expect(
			screen.getByRole("region", { name: "PDF document viewer" }),
		).toHaveClass("h-full", "min-h-0");
		await waitFor(() => expect(mockGetPage).toHaveBeenCalledWith(1));
		expect(screen.getByText("1 / 2")).toBeInTheDocument();
		expect(screen.getByText("77%")).toBeInTheDocument();
		expect(screen.getByLabelText("invoice.pdf")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Download" })).toHaveAttribute(
			"href",
			"/api/tgem/invoices/case-1/documents/document-1",
		);

		fireEvent.click(screen.getByRole("button", { name: "Next page" }));
		await waitFor(() => expect(mockGetPage).toHaveBeenCalledWith(2));
		expect(screen.getByText("2 / 2")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Rotate" }));
		fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
		await waitFor(() => expect(mockRender).toHaveBeenCalledTimes(3));
	});

	it("pans an overflowing document by dragging it", async () => {
		render(
			<TgemPdfViewer
				documentPath="/api/tgem/invoices/case-1/documents/document-1"
				filename="invoice.pdf"
				language="en"
			/>,
		);

		await waitFor(() => expect(mockGetPage).toHaveBeenCalledWith(1));
		const viewport = screen.getByTestId("tgem-pdf-viewport");
		Object.defineProperties(viewport, {
			scrollWidth: { configurable: true, value: 1200 },
			scrollHeight: { configurable: true, value: 1600 },
			clientHeight: { configurable: true, value: 500 },
			scrollLeft: { configurable: true, value: 100, writable: true },
			scrollTop: { configurable: true, value: 200, writable: true },
			setPointerCapture: { configurable: true, value: jest.fn() },
			hasPointerCapture: { configurable: true, value: () => true },
			releasePointerCapture: { configurable: true, value: jest.fn() },
		});

		fireEvent.pointerDown(viewport, {
			button: 0,
			pointerId: 7,
			clientX: 300,
			clientY: 300,
		});
		fireEvent.pointerMove(viewport, {
			pointerId: 7,
			clientX: 250,
			clientY: 225,
		});

		expect(viewport).toHaveClass("cursor-grabbing");
		expect(viewport.scrollLeft).toBe(150);
		expect(viewport.scrollTop).toBe(275);

		fireEvent.pointerUp(viewport, { pointerId: 7 });
		expect(viewport).toHaveClass("cursor-grab");
	});

	it("switches from grab-to-pan to selectable PDF text", async () => {
		render(
			<TgemPdfViewer
				documentPath="/api/tgem/invoices/case-1/documents/document-1"
				filename="invoice.pdf"
				language="en"
			/>,
		);

		await waitFor(() => expect(mockTextLayerRender).toHaveBeenCalled());
		const toggle = screen.getByRole("button", { name: "Select PDF text" });
		const viewport = screen.getByTestId("tgem-pdf-viewport");
		const textLayer = screen.getByTestId("tgem-pdf-text-layer");

		expect(toggle).toHaveAttribute("aria-pressed", "false");
		expect(viewport).toHaveClass("cursor-grab", "select-none");
		expect(textLayer).toHaveClass("pointer-events-none", "select-none");

		fireEvent.click(toggle);

		expect(toggle).toHaveAttribute("aria-pressed", "true");
		expect(toggle).toHaveAccessibleName("Turn off copy mode");
		expect(viewport).toHaveClass("cursor-text", "select-text");
		expect(textLayer).toHaveClass("pointer-events-auto", "select-text");
		expect(screen.getByRole("status")).toHaveTextContent("Copy mode is on");
		expect(screen.getByRole("status")).toHaveTextContent(
			"Turn off copy mode to move the page again.",
		);
		expect(
			screen.getByTestId("tgem-pdf-copy-mode-control"),
		).not.toContainElement(screen.getByRole("status"));
		expect(viewport).not.toContainElement(screen.getByRole("status"));
		expect(screen.getByRole("status")).toHaveClass("fixed");
		expect(mockTextLayerConstructor).toHaveBeenCalledWith(
			expect.objectContaining({
				textContentSource: expect.objectContaining({
					items: expect.any(Array),
				}),
			}),
		);

		fireEvent.click(toggle);
		expect(toggle).toHaveAttribute("aria-pressed", "false");
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
		expect(viewport).toHaveClass("cursor-grab", "select-none");
	});

	it("points Latvian users to text mode when a PDF page has no embedded text", async () => {
		mockGetTextContent.mockResolvedValue({ items: [], styles: {} });

		render(
			<TgemPdfViewer
				documentPath="/api/tgem/invoices/case-1/documents/document-1"
				filename="invoice.pdf"
				language="lv"
			/>,
		);

		const toggle = await screen.findByRole("button", {
			name: "Kopēt PDF tekstu",
		});
		await waitFor(() => {
			expect(toggle).toBeDisabled();
			expect(toggle).toHaveAttribute(
				"title",
				"Šajā PDF lapā nav atlasāma teksta. Izmantojiet teksta versiju.",
			);
		});
		expect(
			screen.getByText(
				"Šajā PDF lapā nav atlasāma teksta. Izmantojiet teksta versiju.",
			),
		).toBeInTheDocument();
	});

	it("offers a localized retry when the PDF request fails", async () => {
		mockFetch
			.mockResolvedValueOnce({ ok: false } as Response)
			.mockResolvedValueOnce({
				ok: true,
				arrayBuffer: async () => new ArrayBuffer(16),
			} as Response);

		render(
			<TgemPdfViewer
				documentPath="/api/tgem/invoices/case-1/documents/document-1"
				filename="invoice.pdf"
				language="lv"
			/>,
		);

		fireEvent.click(
			await screen.findByRole("button", { name: "Mēģināt vēlreiz" }),
		);
		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(mockGetPage).toHaveBeenCalledWith(1));
	});
});
