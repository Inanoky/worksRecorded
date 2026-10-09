import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type { ComponentProps } from "react";
import type { VisualEvidence, VisualMark } from "./model";
import { VisualZoneTarget } from "./VisualZoneTarget";

jest.mock("next/image", () => ({
	__esModule: true,
	default: ({
		fill,
		sizes,
		unoptimized,
		alt,
		...props
	}: ComponentProps<"img"> & { fill?: boolean; unoptimized?: boolean }) => (
		<img alt={alt} {...props} />
	),
}));

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
const source: VisualEvidence = {
	id: "photo",
	recordId: "record",
	photoUrl: "https://example.com/actual-source.jpg",
	work: "XPS 150 mm",
	location: "1. stāvs",
	description: "Installed XPS",
	date: "2026-10-09",
	amount: 10,
	unit: "m2",
};

it("opens the original source image from the hover preview with diary zoom controls and keeps it open after hover closes", async () => {
	const onSelect = jest.fn();
	render(
		<VisualZoneTarget
			mark={mark}
			source={source}
			disabled={false}
			onSelect={onSelect}
			onHighlight={jest.fn()}
		/>,
	);
	const zone = screen.getByRole("button", { name: "XPS: Completed XPS" });
	fireEvent.focus(zone);
	const preview = await screen.findByRole("button", {
		name: "Atvērt zonas avota attēlu: XPS 150 mm",
	});
	fireEvent.load(within(preview).getByRole("img"));
	fireEvent.click(preview);
	const dialog = within(screen.getByRole("dialog"));
	expect(dialog.getByRole("img")).toHaveAttribute("src", source.photoUrl);
	expect(dialog.getByLabelText("Tālummaiņa")).toHaveTextContent("100%");
	fireEvent.pointerLeave(zone);
	fireEvent.click(dialog.getByRole("button", { name: "Pietuvināt" }));
	expect(dialog.getByLabelText("Tālummaiņa")).toHaveTextContent("150%");
	fireEvent.wheel(
		dialog.getByRole("region", { name: "Foto tālummaiņas skats" }),
		{ deltaY: -100 },
	);
	expect(dialog.getByLabelText("Tālummaiņa")).toHaveTextContent("175%");
	fireEvent.click(dialog.getByRole("button", { name: "Ietilpināt" }));
	expect(dialog.getByLabelText("Tālummaiņa")).toHaveTextContent("100%");
	expect(onSelect).not.toHaveBeenCalled();
	fireEvent.click(dialog.getByRole("button", { name: "Close" }));
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
	);
	expect(zone).toHaveFocus();
	fireEvent.focus(zone);
	fireEvent.click(
		await screen.findByRole("button", {
			name: "Atvērt zonas avota attēlu: XPS 150 mm",
		}),
	);
	expect(
		within(screen.getByRole("dialog")).getByLabelText("Tālummaiņa"),
	).toHaveTextContent("100%");
});

it("hides the hover popup once a zone is selected so details only appear in the right panel", async () => {
	const props = {
		mark,
		source,
		disabled: false,
		onSelect: jest.fn(),
		onHighlight: jest.fn(),
	};
	const { rerender } = render(<VisualZoneTarget {...props} />);
	fireEvent.focus(screen.getByRole("button", { name: "XPS: Completed XPS" }));
	await screen.findByRole("button", {
		name: "Atvērt zonas avota attēlu: XPS 150 mm",
	});
	rerender(<VisualZoneTarget {...props} selected />);
	await waitFor(() =>
		expect(
			screen.queryByRole("button", {
				name: "Atvērt zonas avota attēlu: XPS 150 mm",
			}),
		).not.toBeInTheDocument(),
	);
});

it("does not offer an unavailable source image for zoom", async () => {
	render(
		<VisualZoneTarget
			mark={mark}
			source={source}
			disabled={false}
			onSelect={jest.fn()}
			onHighlight={jest.fn()}
		/>,
	);
	fireEvent.focus(screen.getByRole("button", { name: "XPS: Completed XPS" }));
	const preview = await screen.findByRole("button", {
		name: "Atvērt zonas avota attēlu: XPS 150 mm",
	});
	fireEvent.error(within(preview).getByRole("img"));
	expect(preview).toBeDisabled();
	fireEvent.click(preview);
	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
