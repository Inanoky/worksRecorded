import { fireEvent, render, screen } from "@testing-library/react";
import { useVisualWorkspace } from "./useVisualWorkspace";

function Workspace({ active }: { active: boolean }) {
	const { workspace, height } = useVisualWorkspace(active);
	return (
		<div style={{ paddingBottom: 20 }}>
			<section ref={workspace} data-testid="workspace" style={{ height }} />
		</div>
	);
}

it("fits below the project header, including parent bottom spacing, and recalculates on resize", () => {
	const originalHeight = window.innerHeight;
	const margin = document.body.style.margin;
	document.body.style.margin = "0";
	const geometry = jest
		.spyOn(HTMLElement.prototype, "getBoundingClientRect")
		.mockReturnValue({ top: 220 } as DOMRect);
	try {
		Object.defineProperty(window, "innerHeight", {
			configurable: true,
			value: 900,
		});
		render(<Workspace active />);
		expect(screen.getByTestId("workspace")).toHaveStyle({ height: "648px" });
		Object.defineProperty(window, "innerHeight", {
			configurable: true,
			value: 720,
		});
		fireEvent(window, new Event("resize"));
		expect(screen.getByTestId("workspace")).toHaveStyle({ height: "468px" });
	} finally {
		geometry.mockRestore();
		Object.defineProperty(window, "innerHeight", {
			configurable: true,
			value: originalHeight,
		});
		document.body.style.margin = margin;
	}
});

it("does not measure hidden retained tabs and measures again on return", () => {
	const geometry = jest
		.spyOn(HTMLElement.prototype, "getBoundingClientRect")
		.mockReturnValue({ top: 220 } as DOMRect);
	try {
		const view = render(<Workspace active={false} />);
		expect(geometry).not.toHaveBeenCalled();
		view.rerender(<Workspace active />);
		const height = screen.getByTestId("workspace").style.height;
		view.rerender(<Workspace active={false} />);
		geometry.mockReturnValue({ top: 400 } as DOMRect);
		fireEvent(window, new Event("resize"));
		expect(screen.getByTestId("workspace").style.height).toBe(height);
		view.rerender(<Workspace active />);
		expect(screen.getByTestId("workspace").style.height).not.toBe(height);
	} finally {
		geometry.mockRestore();
	}
});
