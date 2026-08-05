import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DefaultConstructionForma2TableScroll } from "./DefaultConstructionForma2TableScroll";

class ResizeObserverMock {
	observe() {}
	disconnect() {}
}

describe("DefaultConstructionForma2TableScroll", () => {
	beforeAll(() => {
		Object.defineProperty(global, "ResizeObserver", {
			configurable: true,
			value: ResizeObserverMock,
		});
	});

	it("keeps the floating scrollbar synchronized with an overflowing table", async () => {
		const { container } = render(
			<DefaultConstructionForma2TableScroll label="Scroll table">
				<table>
					<tbody>
						<tr>
							<td>Position</td>
						</tr>
					</tbody>
				</table>
			</DefaultConstructionForma2TableScroll>,
		);
		const content = screen.getByRole("region", { name: "Scroll table" });
		const scrollbar = container.querySelector<HTMLElement>(
			'[data-slot="forma2-floating-scrollbar"]',
		);
		expect(scrollbar).not.toBeNull();
		Object.defineProperty(content, "scrollWidth", {
			configurable: true,
			value: 1200,
		});
		Object.defineProperty(content, "clientWidth", {
			configurable: true,
			value: 800,
		});

		fireEvent.resize(window);
		await waitFor(() => expect(scrollbar).not.toHaveClass("hidden"));

		content.scrollLeft = 160;
		fireEvent.scroll(content);
		expect(scrollbar).toHaveProperty("scrollLeft", 160);

		if (!scrollbar) throw new Error("Floating scrollbar was not rendered");
		scrollbar.scrollLeft = 80;
		fireEvent.scroll(scrollbar);
		expect(content).toHaveProperty("scrollLeft", 80);
	});
});
