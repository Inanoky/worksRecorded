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

it("deletes only the selected polygon and disables deletion during unsaved geometry edits", async () => {
	const onDelete = jest.fn();
	const props = {
		url: "/drawing",
		marks: [mark, { ...mark, id: "sibling" }],
		selected: "sibling",
		onSelect: jest.fn(),
		editable: true,
		onDelete,
		onSave: jest.fn(),
	};
	const view = render(<VisualPdf {...props} />);
	await waitFor(() =>
		expect(
			screen.getByRole("button", { name: "Dzēst poligonu" }),
		).toBeEnabled(),
	);
	fireEvent.click(screen.getByRole("button", { name: "Dzēst poligonu" }));
	expect(onDelete).toHaveBeenCalledWith({
		markId: "sibling",
		expectedPolygon: mark.polygon,
	});
	fireEvent.click(screen.getByRole("button", { name: "Pielāgot zonu" }));
	expect(
		screen.queryByRole("button", { name: "Dzēst poligonu" }),
	).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Atcelt" }));
	view.rerender(<VisualPdf {...props} editable={false} />);
	expect(screen.getByRole("button", { name: "Dzēst poligonu" })).toBeDisabled();
	view.rerender(<VisualPdf {...props} selected={null} />);
	expect(screen.getByRole("button", { name: "Dzēst poligonu" })).toBeDisabled();
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

it("highlights a hovered or focused zone without selecting or saving it", async () => {
	const onSelect = jest.fn();
	const { container } = render(
		<VisualPdf
			url="/drawing"
			marks={[mark]}
			selected={null}
			onSelect={onSelect}
		/>,
	);
	const target = await screen.findByRole("button", { name: "XPS: Sakrīt" });
	const polygon = container.querySelector("polygon");
	expect(polygon).toHaveAttribute("fill-opacity", "0.5");
	fireEvent.pointerEnter(target);
	expect(polygon).toHaveAttribute("fill-opacity", "0.8");
	expect(polygon).toHaveAttribute("stroke-width", "3");
	fireEvent.pointerLeave(target);
	expect(polygon).toHaveAttribute("fill-opacity", "0.5");
	fireEvent.focus(target);
	expect(polygon).toHaveAttribute("fill-opacity", "0.8");
	fireEvent.blur(target);
	expect(polygon).toHaveAttribute("fill-opacity", "0.5");
	expect(onSelect).not.toHaveBeenCalled();
	expect(global.fetch).toHaveBeenCalledTimes(1);
});

it("uses translucent fills with stronger opacity for the selected zone", async () => {
	const { container } = render(
		<VisualPdf
			url="/drawing"
			marks={[mark, { ...mark, id: "sand", layer: "sand" }]}
			selected="sand"
			onSelect={jest.fn()}
		/>,
	);
	await waitFor(() =>
		expect(container.querySelectorAll("polygon")).toHaveLength(2),
	);
	const polygons = container.querySelectorAll("polygon");
	expect(polygons[0]).toHaveAttribute("fill", "#eab308");
	expect(polygons[1]).toHaveAttribute("fill", "#16a34a");
	expect(polygons[0]).toHaveAttribute("fill-opacity", "0.5");
	expect(polygons[1]).toHaveAttribute("fill-opacity", "0.85");
	expect(polygons[1]).toHaveAttribute("stroke", "#0f172a");
	expect(polygons[1]).toHaveAttribute("stroke-width", "4");
	expect(screen.getByRole("button", { name: /Smilts:/ })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
});

it.each(["canvas", "surface", "viewport"])(
	"deselects the zone when clicking the empty %s without reloading the PDF",
	async (background) => {
		const onSelect = jest.fn();
		const props = { url: "/drawing", marks: [mark], onSelect };
		const { container, rerender } = render(
			<VisualPdf {...props} selected="mark" />,
		);
		await screen.findByRole("button", { name: "XPS: Sakrīt" });
		const canvas = container.querySelector("canvas") as HTMLCanvasElement;
		const target =
			background === "canvas"
				? canvas
				: background === "surface"
					? (canvas.parentElement as HTMLElement)
					: screen.getByTestId("visual-viewport");
		fireEvent.click(target);
		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenCalledWith(null);
		rerender(<VisualPdf {...props} selected={null} />);
		expect(container.querySelector("polygon")).toHaveAttribute(
			"fill-opacity",
			"0.5",
		);
		expect(global.fetch).toHaveBeenCalledTimes(1);
	},
);

it("selects another zone without clearing it and keeps selection when using zoom controls", async () => {
	const onSelect = jest.fn();
	render(
		<VisualPdf
			url="/drawing"
			marks={[mark, { ...mark, id: "sand", layer: "sand" }]}
			selected="mark"
			onSelect={onSelect}
		/>,
	);
	fireEvent.click(await screen.findByRole("button", { name: /Smilts:/ }));
	fireEvent.click(screen.getByRole("button", { name: "Tuvināt" }));
	expect(onSelect.mock.calls).toEqual([["sand"]]);
});

it("does not deselect after dragging the map", async () => {
	const originalPointerEvent = window.PointerEvent;
	window.PointerEvent = MouseEvent as typeof PointerEvent;
	const onSelect = jest.fn();
	try {
		render(
			<VisualPdf
				url="/drawing"
				marks={[mark]}
				selected="mark"
				onSelect={onSelect}
			/>,
		);
		await screen.findByRole("button", { name: "XPS: Sakrīt" });
		const viewport = screen.getByTestId("visual-viewport");
		viewport.setPointerCapture = jest.fn();
		fireEvent.pointerDown(viewport, { button: 0, clientX: 100, clientY: 100 });
		fireEvent.pointerMove(viewport, { clientX: 120, clientY: 100 });
		fireEvent.pointerUp(viewport, { clientX: 120, clientY: 100 });
		fireEvent.click(viewport);
		expect(onSelect).not.toHaveBeenCalled();
		fireEvent.click(viewport);
		expect(onSelect).toHaveBeenCalledWith(null);
	} finally {
		window.PointerEvent = originalPointerEvent;
	}
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

it("zooms with buttons and mouse wheel without reloading the drawing", async () => {
	const { container } = render(
		<VisualPdf
			url="/drawing"
			marks={[mark]}
			selected={null}
			onSelect={jest.fn()}
		/>,
	);
	await waitFor(() =>
		expect(container.querySelector("polygon")).toBeInTheDocument(),
	);
	expect(container.querySelector("polygon")).toHaveAttribute(
		"fill-opacity",
		"0.5",
	);
	expect(screen.getByRole("button", { name: "Attālināt" })).toBeDisabled();
	fireEvent.wheel(screen.getByTestId("visual-viewport"), { deltaY: 100 });
	expect(screen.getByLabelText("Mērogs")).toHaveTextContent("100%");
	fireEvent.click(screen.getByRole("button", { name: "Tuvināt" }));
	await waitFor(() =>
		expect(screen.getByLabelText("Mērogs")).toHaveTextContent("125%"),
	);
	expect(screen.getByRole("button", { name: "Attālināt" })).toBeEnabled();
	fireEvent.wheel(screen.getByTestId("visual-viewport"), { deltaY: -100 });
	await waitFor(() =>
		expect(screen.getByLabelText("Mērogs")).toHaveTextContent("153%"),
	);
	fireEvent.click(screen.getByRole("button", { name: "Ietilpināt" }));
	await waitFor(() =>
		expect(screen.getByLabelText("Mērogs")).toHaveTextContent("100%"),
	);
	expect(screen.getByRole("button", { name: "Attālināt" })).toBeDisabled();
	expect(global.fetch).toHaveBeenCalledTimes(1);
});

it("edits locally with stable corner focus, supports adding/removing corners and saves only on confirmation", async () => {
	const onSave = jest.fn().mockResolvedValue(undefined);
	const onEditingChange = jest.fn();
	const onSelect = jest.fn();
	const { container } = render(
		<VisualPdf
			url="/drawing"
			marks={[mark]}
			selected="mark"
			onSelect={onSelect}
			editable
			onSave={onSave}
			onEditingChange={onEditingChange}
		/>,
	);
	await waitFor(() =>
		expect(screen.getByRole("button", { name: "Pielāgot zonu" })).toBeEnabled(),
	);
	fireEvent.click(screen.getByRole("button", { name: "Pielāgot zonu" }));
	fireEvent.click(screen.getByTestId("visual-viewport"));
	expect(onSelect).not.toHaveBeenCalled();
	const corner = screen.getByRole("button", { name: "Stūris 1" });
	corner.focus();
	fireEvent.keyDown(corner, { key: "ArrowRight", shiftKey: true });
	expect(corner).toHaveFocus();
	expect(container.querySelector("polygon")).toHaveAttribute(
		"points",
		"0.11,0.1 0.4,0.1 0.4,0.4",
	);
	fireEvent.click(
		screen.getByRole("button", { name: "Pievienot stūri pie malas 1" }),
	);
	expect(screen.getAllByRole("button", { name: /^Stūris/ })).toHaveLength(4);
	fireEvent.keyDown(screen.getByRole("button", { name: "Stūris 2" }), {
		key: "Delete",
	});
	expect(screen.getAllByRole("button", { name: /^Stūris/ })).toHaveLength(3);
	expect(onSave).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt zonu" }));
	await waitFor(() => expect(onEditingChange).toHaveBeenLastCalledWith(false));
	expect(onSave).toHaveBeenCalledWith({
		markId: "mark",
		expectedPolygon: mark.polygon,
		polygon: [{ x: 0.11, y: 0.1 }, ...mark.polygon.slice(1)],
	});
});

it("cancels geometry changes without persisting and retains edits if saving fails", async () => {
	const onSave = jest.fn().mockRejectedValue(new Error("Conflict"));
	const { container } = render(
		<VisualPdf
			url="/drawing"
			marks={[mark]}
			selected="mark"
			onSelect={jest.fn()}
			editable
			onSave={onSave}
		/>,
	);
	await waitFor(() =>
		expect(screen.getByRole("button", { name: "Pielāgot zonu" })).toBeEnabled(),
	);
	fireEvent.click(screen.getByRole("button", { name: "Pielāgot zonu" }));
	fireEvent.keyDown(screen.getByRole("button", { name: "Stūris 1" }), {
		key: "ArrowRight",
	});
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt zonu" }));
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Neizdevās saglabāt",
	);
	expect(screen.getByRole("button", { name: "Stūris 1" })).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Atcelt" }));
	expect(container.querySelector("polygon")).toHaveAttribute(
		"points",
		"0.1,0.1 0.4,0.1 0.4,0.4",
	);
	expect(onSave).toHaveBeenCalledTimes(1);
});

it("drags corners using the zoomed surface bounds without losing pointer capture", async () => {
	const originalPointerEvent = window.PointerEvent;
	window.PointerEvent = MouseEvent as typeof PointerEvent;
	const capture = jest.fn();
	const onSave = jest.fn().mockResolvedValue(undefined);
	try {
		const { container } = render(
			<VisualPdf
				url="/drawing"
				marks={[mark]}
				selected="mark"
				onSelect={jest.fn()}
				editable
				onSave={onSave}
			/>,
		);
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Pielāgot zonu" }),
			).toBeEnabled(),
		);
		fireEvent.click(screen.getByRole("button", { name: "Tuvināt" }));
		fireEvent.click(screen.getByRole("button", { name: "Pielāgot zonu" }));
		const surface = container.querySelector("canvas")
			?.parentElement as HTMLElement;
		jest.spyOn(surface, "getBoundingClientRect").mockReturnValue({
			left: 100,
			top: 50,
			width: 1000,
			height: 2000,
		} as DOMRect);
		const corner = screen.getByRole("button", { name: "Stūris 1" });
		corner.setPointerCapture = capture;
		fireEvent.pointerDown(corner, { clientX: 200, clientY: 250 });
		fireEvent.pointerMove(corner, { clientX: 300, clientY: 450 });
		expect(screen.getByRole("button", { name: "Stūris 1" })).toBe(corner);
		expect(capture).toHaveBeenCalledTimes(1);
		fireEvent.pointerUp(corner);
		fireEvent.click(screen.getByRole("button", { name: "Saglabāt zonu" }));
		await waitFor(() =>
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					polygon: [{ x: 0.2, y: 0.2 }, ...mark.polygon.slice(1)],
				}),
			),
		);
	} finally {
		window.PointerEvent = originalPointerEvent;
	}
});
