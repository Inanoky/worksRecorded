import { act, render } from "@testing-library/react";
import { createLandingSlideshow } from "./landing-slideshow";
import { useLandingSlideshow } from "./useLandingSlideshow";

jest.mock("./landing-slideshow", () => ({
	createLandingSlideshow: jest.fn(),
}));

let mobile: boolean;
let listeners: Set<() => void>;
const stop = jest.fn();

function Page() {
	const main = useLandingSlideshow();
	return <main ref={main} />;
}

function resize(isMobile: boolean) {
	act(() => {
		mobile = isMobile;
		for (const listener of listeners) listener();
	});
}

beforeEach(() => {
	mobile = false;
	listeners = new Set();
	stop.mockClear();
	jest.mocked(createLandingSlideshow).mockReset().mockReturnValue(stop);
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: jest.fn(() => ({
			get matches() {
				return mobile;
			},
			addEventListener: (_event: string, listener: () => void) =>
				listeners.add(listener),
			removeEventListener: (_event: string, listener: () => void) =>
				listeners.delete(listener),
		})),
	});
});

it("leaves mobile scrolling entirely native", () => {
	mobile = true;
	render(<Page />);
	expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 1023px)");
	expect(createLandingSlideshow).not.toHaveBeenCalled();
});

it("starts the slideshow on desktop and stops it when entering mobile layout", () => {
	render(<Page />);
	expect(createLandingSlideshow).toHaveBeenCalledTimes(1);
	resize(true);
	expect(stop).toHaveBeenCalledTimes(1);
	expect(createLandingSlideshow).toHaveBeenCalledTimes(1);
});

it("enables the slideshow when returning from mobile to desktop", () => {
	mobile = true;
	render(<Page />);
	resize(false);
	expect(createLandingSlideshow).toHaveBeenCalledTimes(1);
});

it("cleans up both the slideshow and its breakpoint listener on navigation", () => {
	const page = render(<Page />);
	expect(listeners.size).toBe(1);
	page.unmount();
	expect(stop).toHaveBeenCalledTimes(1);
	expect(listeners.size).toBe(0);
});
