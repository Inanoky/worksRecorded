import { animate } from "motion";
import { createLandingSlideshow } from "./landing-slideshow";
import { LANDING_SLIDE_REQUEST } from "./landing-slideshow-events";

jest.mock("motion", () => ({
	animate: jest.fn(
		(
			_from: number,
			to: number,
			options: {
				duration: number;
				onUpdate: (value: number) => void;
				onComplete: () => void;
			},
		) => {
			const timer = window.setTimeout(() => {
				options.onUpdate(to);
				options.onComplete();
			}, options.duration * 1000);
			return { stop: () => window.clearTimeout(timer) };
		},
	),
}));

let main: HTMLElement;
let dispose: () => void;
let reducedMotion: boolean;

const wheel = (deltaY = 120, target: HTMLElement = main, ctrlKey = false) => {
	const event = new WheelEvent("wheel", {
		deltaY,
		ctrlKey,
		bubbles: true,
		cancelable: true,
	});
	target.dispatchEvent(event);
	return event;
};
const swipe = (type: string, y: number) => {
	const event = new Event(type, { bubbles: true, cancelable: true });
	Object.defineProperty(event, "touches", {
		value: type === "touchend" ? [] : [{ clientX: 100, clientY: y }],
	});
	main.dispatchEvent(event);
	return event;
};

beforeEach(() => {
	jest.useFakeTimers();
	jest.mocked(animate).mockClear();
	reducedMotion = false;
	Object.defineProperty(window, "scrollY", {
		configurable: true,
		writable: true,
		value: 0,
	});
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: () => ({
			get matches() {
				return reducedMotion;
			},
		}),
	});
	jest
		.spyOn(window, "scrollTo")
		.mockImplementation((options: ScrollToOptions | number) => {
			if (typeof options === "object")
				window.scrollY = options.top ?? window.scrollY;
		});
	document.body.innerHTML =
		'<div class="landing-tactile"><div data-landing-scroll-start></div><main><div data-landing-section><div>First</div></div><div data-landing-section><div>Second</div></div><div data-landing-section><div>Third</div></div></main><footer>Footer</footer></div>';
	main = document.querySelector("main") as HTMLElement;
	const header = document.querySelector(
		"[data-landing-scroll-start]",
	) as HTMLElement;
	header.getBoundingClientRect = () => new DOMRect(0, 0, 1200, 72);
	const elements = [
		...main.querySelectorAll<HTMLElement>("[data-landing-section]"),
		document.querySelector("footer") as HTMLElement,
	];
	for (const [index, element] of elements.entries()) {
		element.getBoundingClientRect = () =>
			new DOMRect(0, 72 + index * 728 - window.scrollY, 1200, 728);
	}
	dispose = createLandingSlideshow(main);
});

afterEach(() => {
	dispose();
	jest.clearAllTimers();
	jest.useRealTimers();
	jest.restoreAllMocks();
	document.body.removeAttribute("data-scroll-locked");
	document.body.innerHTML = "";
});

it("advances exactly one complete section for a wheel gesture, including its inertia", () => {
	expect(wheel().defaultPrevented).toBe(true);
	for (let packet = 0; packet < 10; packet++) {
		jest.advanceTimersByTime(90);
		wheel(40);
	}
	expect(animate).toHaveBeenCalledTimes(1);
	expect(window.scrollY).toBe(728);
	jest.advanceTimersByTime(201);
	wheel();
	jest.advanceTimersByTime(650);
	expect(animate).toHaveBeenCalledTimes(2);
	expect(window.scrollY).toBe(1456);
});

it("lets a long section scroll internally and requires a new gesture to leave it", () => {
	const content = main.firstElementChild?.firstElementChild as HTMLElement;
	content.style.overflowY = "auto";
	Object.defineProperty(content, "clientHeight", { value: 300 });
	Object.defineProperty(content, "scrollHeight", { value: 900 });
	expect(wheel(120, content).defaultPrevented).toBe(false);
	content.scrollTop = 600;
	expect(wheel(120, content).defaultPrevented).toBe(true);
	expect(animate).not.toHaveBeenCalled();
	jest.advanceTimersByTime(201);
	wheel(120, content);
	jest.advanceTimersByTime(650);
	expect(window.scrollY).toBe(728);
});

it("settles a scrollbar position onto a complete section", () => {
	window.scrollY = 1100;
	window.dispatchEvent(new Event("scroll"));
	jest.advanceTimersByTime(160 + 650);
	expect(window.scrollY).toBe(1456);
});

it("does not undo a restored position when the viewport and header have not changed", () => {
	window.scrollY = 1456;
	window.dispatchEvent(new Event("resize"));
	expect(window.scrollY).toBe(1456);
	expect(animate).not.toHaveBeenCalled();
});

it("supports keyboard navigation without intercepting form fields", () => {
	const pageDown = new KeyboardEvent("keydown", {
		key: "PageDown",
		bubbles: true,
		cancelable: true,
	});
	main.dispatchEvent(pageDown);
	expect(pageDown.defaultPrevented).toBe(true);
	jest.advanceTimersByTime(650);
	expect(window.scrollY).toBe(728);
	const input = document.createElement("input");
	main.append(input);
	const arrow = new KeyboardEvent("keydown", {
		key: "ArrowDown",
		bubbles: true,
		cancelable: true,
	});
	input.dispatchEvent(arrow);
	expect(arrow.defaultPrevented).toBe(false);
	main.dispatchEvent(
		new KeyboardEvent("keydown", { key: "End", bubbles: true }),
	);
	jest.advanceTimersByTime(650);
	expect(window.scrollY).toBe(2184);
});

it("turns a vertical touch swipe into one section transition", () => {
	swipe("touchstart", 500);
	expect(swipe("touchmove", 300).defaultPrevented).toBe(true);
	expect(swipe("touchend", 300).defaultPrevented).toBe(true);
	jest.advanceTimersByTime(650);
	expect(window.scrollY).toBe(728);
});

it("leaves open menus and browser zoom in control of their input", () => {
	document.body.setAttribute("data-scroll-locked", "1");
	expect(wheel().defaultPrevented).toBe(false);
	document.body.removeAttribute("data-scroll-locked");
	expect(wheel(120, main, true).defaultPrevented).toBe(false);
	expect(animate).not.toHaveBeenCalled();
});

it("routes section links to the correct slide and respects reduced motion", () => {
	reducedMotion = true;
	const target = main.querySelectorAll<HTMLElement>("[data-landing-section]")[2]
		.firstElementChild;
	main.dispatchEvent(
		new CustomEvent(LANDING_SLIDE_REQUEST, { detail: target }),
	);
	expect(window.scrollY).toBe(1456);
	expect(animate).not.toHaveBeenCalled();
});

it("removes its input handlers and cancels animation when leaving the landing", () => {
	wheel();
	dispose();
	jest.advanceTimersByTime(1000);
	expect(window.scrollY).toBe(0);
	expect(main.hasAttribute("data-landing-slideshow")).toBe(false);
	expect(wheel().defaultPrevented).toBe(false);
});
