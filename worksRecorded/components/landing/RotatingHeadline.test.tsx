import { act, render, screen } from "@testing-library/react";
import { RotatingHeadline } from "./RotatingHeadline";

describe("RotatingHeadline", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		Object.defineProperty(window, "matchMedia", {
			configurable: true,
			value: jest.fn().mockReturnValue({ matches: false }),
		});
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("rotates through each headline without changing its container", () => {
		render(
			<RotatingHeadline
				items={["Site records", "Production records", "Cost control"]}
			/>,
		);

		expect(screen.getByText("Site records")).toHaveClass("opacity-100");
		expect(screen.getByText("Production records")).toHaveClass("opacity-0");

		act(() => jest.advanceTimersByTime(2200));

		expect(screen.getByText("Site records")).toHaveClass("opacity-0");
		expect(screen.getByText("Production records")).toHaveClass("opacity-100");

		act(() => jest.advanceTimersByTime(2200));

		expect(screen.getByText("Cost control")).toHaveClass("opacity-100");
	});
});
