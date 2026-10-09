import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { type VisualEvidence, type VisualMark, visualLayers } from "./model";
import { VisualSidebar } from "./VisualSidebar";

const marks: VisualMark[] = Array.from({ length: 13 }, (_, i) => ({
	id: `mark-${i}`,
	evidenceId: `source-${i}`,
	layer: "sand",
	page: 1,
	confidence: 0.9,
	polygon: [
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 1, y: 1 },
	],
	anchors: ["A", "B"],
	explanation: "Zone",
}));
const evidence: VisualEvidence[] = marks.map((mark, i) => ({
	id: mark.evidenceId,
	recordId: `record-${i}`,
	photoUrl: "https://example.com/photo.jpg",
	work: `Work ${i + 1}`,
	location: "1. stāvs",
	date: "2026-10-01",
	description: "Done",
	amount: 10,
	unit: "m2",
}));
const props = {
	id: "sidebar",
	open: true,
	marks,
	datedMarks: marks,
	evidence,
	dayByEvidence: new Map<string, number | null>(),
	layers: Object.keys(visualLayers) as (keyof typeof visualLayers)[],
	onLayers: jest.fn(),
	selected: null,
	onSelect: jest.fn(),
	locked: false,
};

beforeEach(() => jest.clearAllMocks());

it("paginates chronological sources without nested scrolling and keeps selection linked", () => {
	render(<VisualSidebar {...props} />);
	fireEvent.click(screen.getByRole("button", { name: "Zonu avoti" }));
	const list = screen.getByTestId("visual-sidebar-list");
	expect(list).toHaveClass("overflow-hidden");
	expect(within(list).getAllByRole("button")).toHaveLength(4);
	expect(screen.getByText("1–4 no 13")).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Nākamā avotu lapa" }));
	expect(screen.getByText("5–8 no 13")).toBeInTheDocument();
	fireEvent.click(within(list).getAllByRole("button")[0]);
	expect(props.onSelect).toHaveBeenCalledWith("mark-4");
	fireEvent.click(
		screen.getByRole("button", { name: "Iepriekšējā avotu lapa" }),
	);
	expect(screen.getByText("1–4 no 13")).toBeInTheDocument();
});

it("clamps the current source page when a date filter removes entries", () => {
	const view = render(<VisualSidebar {...props} />);
	fireEvent.click(screen.getByRole("button", { name: "Zonu avoti" }));
	fireEvent.click(screen.getByRole("button", { name: "Nākamā avotu lapa" }));
	view.rerender(<VisualSidebar {...props} marks={marks.slice(0, 2)} />);
	expect(screen.getByText("1–2 no 2")).toBeInTheDocument();
	expect(
		screen.getByRole("button", { name: "Nākamā avotu lapa" }),
	).toBeDisabled();
});

it("protects unsaved edits and hides controls accessibly", () => {
	const view = render(<VisualSidebar {...props} locked />);
	expect(
		screen
			.getAllByRole("checkbox")
			.every((element) => element.getAttribute("disabled") !== null),
	).toBe(true);
	fireEvent.click(screen.getByRole("button", { name: "Zonu avoti" }));
	expect(
		within(screen.getByTestId("visual-sidebar-list"))
			.getAllByRole("button")
			.every((element) => element.hasAttribute("disabled")),
	).toBe(true);
	view.rerender(<VisualSidebar {...props} open={false} />);
	expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
});

it("fits source pages to available height and disconnects the resize observer", () => {
	const original = global.ResizeObserver;
	let resize!: ResizeObserverCallback;
	const disconnect = jest.fn();
	global.ResizeObserver = jest.fn().mockImplementation((callback) => {
		resize = callback;
		return { observe: jest.fn(), disconnect };
	});
	const geometry = jest
		.spyOn(HTMLElement.prototype, "getBoundingClientRect")
		.mockReturnValue({ height: 136 } as DOMRect);
	try {
		const view = render(<VisualSidebar {...props} />);
		fireEvent.click(screen.getByRole("button", { name: "Zonu avoti" }));
		expect(screen.getByText("1–2 no 13")).toBeInTheDocument();
		geometry.mockReturnValue({ height: 72 } as DOMRect);
		act(() => resize([], {} as ResizeObserver));
		expect(screen.getByText("1–1 no 13")).toBeInTheDocument();
		view.unmount();
		expect(disconnect).toHaveBeenCalled();
	} finally {
		geometry.mockRestore();
		global.ResizeObserver = original;
	}
});
