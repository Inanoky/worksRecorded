import { fireEvent, render, screen } from "@testing-library/react";
import type { VisualMark } from "./model";
import { VisualZoneTarget } from "./VisualZoneTarget";

const mark: VisualMark = {
	id: "zone",
	evidenceId: "photo",
	layer: "xps",
	page: 1,
	confidence: 0.9,
	polygon: [
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 1, y: 1 },
	],
	anchors: [],
	explanation: "Completed XPS",
};

it("highlights on hover and keyboard focus without opening any popup or image dialog", () => {
	const onSelect = jest.fn();
	const onHighlight = jest.fn();
	const { container } = render(
		<VisualZoneTarget
			mark={mark}
			disabled={false}
			onSelect={onSelect}
			onHighlight={onHighlight}
		/>,
	);
	const zone = screen.getByRole("button", { name: "XPS: Completed XPS" });
	fireEvent.pointerEnter(zone);
	expect(onHighlight).toHaveBeenLastCalledWith(true);
	fireEvent.pointerLeave(zone);
	expect(onHighlight).toHaveBeenLastCalledWith(false);
	fireEvent.focus(zone);
	expect(onHighlight).toHaveBeenLastCalledWith(true);
	fireEvent.blur(zone);
	expect(onHighlight).toHaveBeenLastCalledWith(false);
	expect(onSelect).not.toHaveBeenCalled();
	expect(
		container.querySelector('[data-slot="hover-card-content"]'),
	).toBeNull();
	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
it("keeps click selection and pressed state for the right-side panel", () => {
	const onSelect = jest.fn();
	render(
		<VisualZoneTarget
			mark={mark}
			disabled={false}
			selected
			onSelect={onSelect}
			onHighlight={jest.fn()}
		/>,
	);
	const zone = screen.getByRole("button", { name: "XPS: Completed XPS" });
	expect(zone).toHaveAttribute("aria-pressed", "true");
	fireEvent.click(zone);
	expect(onSelect).toHaveBeenCalledTimes(1);
});
it("does not select or highlight a disabled editing target", () => {
	const onSelect = jest.fn();
	const onHighlight = jest.fn();
	render(
		<VisualZoneTarget
			mark={mark}
			disabled
			onSelect={onSelect}
			onHighlight={onHighlight}
		/>,
	);
	const zone = screen.getByRole("button", { name: "XPS: Completed XPS" });
	fireEvent.pointerEnter(zone);
	fireEvent.focus(zone);
	fireEvent.click(zone);
	expect(onHighlight).not.toHaveBeenCalled();
	expect(onSelect).not.toHaveBeenCalled();
});
it("does not render a target for a polygon without area", () => {
	render(
		<VisualZoneTarget
			mark={{
				...mark,
				polygon: [
					{ x: 0.1, y: 0.1 },
					{ x: 0.1, y: 0.5 },
					{ x: 0.1, y: 0.7 },
				],
			}}
			disabled={false}
			onSelect={jest.fn()}
			onHighlight={jest.fn()}
		/>,
	);
	expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
