import { animate } from "motion";
import { LANDING_SLIDE_REQUEST } from "./landing-slideshow-events";

export function createLandingSlideshow(main: HTMLElement) {
	const workspace = main.closest<HTMLElement>(".landing-tactile");
	if (!workspace) return () => {};
	const media = window.matchMedia("(prefers-reduced-motion: reduce)");
	const previousHeaderHeight = workspace.style.getPropertyValue(
		"--landing-header-height",
	);
	let headerHeight = 0;
	let viewportWidth = window.innerWidth;
	let viewportHeight = window.innerHeight;
	let activeIndex = 0;
	let animation: ReturnType<typeof animate> | null = null;
	let animating = false;
	let disposed = false;
	let wheelConsumed = false;
	let wheelScrollingContent = false;
	let wheelDelta = 0;
	let wheelTimer = 0;
	let settleTimer = 0;
	let touch: {
		x: number;
		y: number;
		lastX: number;
		lastY: number;
		target: EventTarget | null;
		consumed: boolean;
	} | null = null;

	const slides = () => {
		const elements = Array.from(
			main.querySelectorAll<HTMLElement>("[data-landing-section]"),
		);
		const footer = workspace.querySelector<HTMLElement>("footer");
		if (footer) elements.push(footer);
		return elements;
	};
	const positions = () =>
		slides().map((element) =>
			Math.max(
				0,
				element.getBoundingClientRect().top + window.scrollY - headerHeight,
			),
		);
	const nearest = () => {
		const offsets = positions();
		return offsets.reduce(
			(best, offset, index) =>
				Math.abs(offset - window.scrollY) <
				Math.abs(offsets[best] - window.scrollY)
					? index
					: best,
			0,
		);
	};
	const moveTo = (index: number, animated = true) => {
		const offsets = positions();
		activeIndex = Math.max(0, Math.min(index, offsets.length - 1));
		const destination = offsets[activeIndex];
		if (destination === undefined) return;
		animation?.stop();
		window.clearTimeout(settleTimer);
		const write = (top: number) => {
			if (!disposed) window.scrollTo({ top, behavior: "instant" });
		};
		if (
			!animated ||
			media.matches ||
			Math.abs(destination - window.scrollY) < 1
		) {
			write(destination);
			animating = false;
			return;
		}
		animating = true;
		animation = animate(window.scrollY, destination, {
			duration: 0.65,
			ease: [0.22, 1, 0.36, 1],
			onUpdate: write,
			onComplete: () => {
				write(destination);
				animating = false;
			},
		});
	};
	const blocked = (target: EventTarget | null) =>
		document.body.hasAttribute("data-scroll-locked") ||
		(target instanceof Element &&
			Boolean(
				target.closest('[role="dialog"], [role="menu"], [role="listbox"]'),
			));
	const canScrollInside = (target: EventTarget | null, direction: number) => {
		if (!(target instanceof Element)) return false;
		for (
			let element: Element | null = target;
			element && element !== workspace;
			element = element.parentElement
		) {
			if (!(element instanceof HTMLElement)) continue;
			if (!/(auto|scroll)/.test(getComputedStyle(element).overflowY)) continue;
			if (element.scrollHeight <= element.clientHeight + 1) continue;
			if (
				direction < 0
					? element.scrollTop > 1
					: element.scrollTop + element.clientHeight < element.scrollHeight - 1
			)
				return true;
		}
		return false;
	};
	const releaseWheel = () => {
		window.clearTimeout(wheelTimer);
		wheelTimer = window.setTimeout(() => {
			wheelConsumed = false;
			wheelScrollingContent = false;
			wheelDelta = 0;
		}, 200);
	};
	const onWheel = (event: WheelEvent) => {
		if (
			event.defaultPrevented ||
			event.ctrlKey ||
			!event.deltaY ||
			Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
			blocked(event.target)
		)
			return;
		const direction = Math.sign(event.deltaY);
		releaseWheel();
		if (animating || (wheelConsumed && !wheelScrollingContent)) {
			wheelConsumed = true;
			wheelScrollingContent = false;
			event.preventDefault();
			return;
		}
		if (canScrollInside(event.target, direction)) {
			wheelConsumed = true;
			wheelScrollingContent = true;
			wheelDelta = 0;
			return;
		}
		event.preventDefault();
		if (wheelConsumed) return;
		const multiplier =
			event.deltaMode === 1
				? 16
				: event.deltaMode === 2
					? window.innerHeight
					: 1;
		if (Math.sign(wheelDelta) !== direction) wheelDelta = 0;
		wheelDelta += event.deltaY * multiplier;
		if (Math.abs(wheelDelta) < 36) return;
		wheelConsumed = true;
		moveTo(nearest() + direction);
	};
	const onKeyDown = (event: KeyboardEvent) => {
		if (
			event.defaultPrevented ||
			blocked(event.target) ||
			event.altKey ||
			event.metaKey
		)
			return;
		const target = event.target instanceof Element ? event.target : null;
		if (
			target?.closest(
				'input, textarea, select, [contenteditable="true"], [role="slider"]',
			)
		)
			return;
		if (event.key === " " && target?.closest('a, button, [role="button"]'))
			return;
		const direction =
			event.key === "ArrowDown" ||
			event.key === "PageDown" ||
			(event.key === " " && !event.shiftKey)
				? 1
				: event.key === "ArrowUp" ||
						event.key === "PageUp" ||
						(event.key === " " && event.shiftKey)
					? -1
					: 0;
		if (!direction && event.key !== "Home" && event.key !== "End") return;
		if (direction && canScrollInside(event.target, direction)) return;
		event.preventDefault();
		if (animating || event.repeat) return;
		moveTo(
			event.key === "Home"
				? 0
				: event.key === "End"
					? slides().length - 1
					: nearest() + direction,
		);
	};
	const onTouchStart = (event: TouchEvent) => {
		if (event.touches.length !== 1 || blocked(event.target)) {
			touch = null;
			return;
		}
		const point = event.touches[0];
		touch = {
			x: point.clientX,
			y: point.clientY,
			lastX: point.clientX,
			lastY: point.clientY,
			target: event.target,
			consumed: false,
		};
	};
	const onTouchMove = (event: TouchEvent) => {
		if (!touch || event.touches.length !== 1) return;
		const point = event.touches[0];
		touch.lastX = point.clientX;
		touch.lastY = point.clientY;
		const delta = touch.y - touch.lastY;
		if (
			Math.abs(delta) < 8 ||
			Math.abs(touch.x - touch.lastX) > Math.abs(delta)
		)
			return;
		if (!animating && canScrollInside(touch.target, Math.sign(delta))) {
			touch.consumed = true;
			return;
		}
		event.preventDefault();
	};
	const onTouchEnd = (event: TouchEvent) => {
		const gesture = touch;
		touch = null;
		if (!gesture || gesture.consumed || animating) return;
		const delta = gesture.y - gesture.lastY;
		if (
			Math.abs(delta) < 40 ||
			Math.abs(gesture.x - gesture.lastX) > Math.abs(delta)
		)
			return;
		event.preventDefault();
		moveTo(nearest() + Math.sign(delta));
	};
	const onTouchCancel = () => {
		touch = null;
	};
	const onScroll = () => {
		if (animating) return;
		window.clearTimeout(settleTimer);
		settleTimer = window.setTimeout(() => moveTo(nearest()), 160);
	};
	const onSectionRequest = (event: Event) => {
		const target = (event as CustomEvent<HTMLElement>).detail;
		if (!(target instanceof HTMLElement)) return;
		const index = slides().findIndex(
			(slide) => slide.contains(target) || target.contains(slide),
		);
		if (index >= 0) moveTo(index);
	};
	const measureHeader = () => {
		headerHeight = Math.max(
			0,
			...Array.from(
				workspace.querySelectorAll<HTMLElement>("[data-landing-scroll-start]"),
			).map((element) => element.getBoundingClientRect().height),
		);
		workspace.style.setProperty("--landing-header-height", `${headerHeight}px`);
	};
	const onResize = () => {
		const previousHeight = headerHeight;
		measureHeader();
		const changed =
			previousHeight !== headerHeight ||
			viewportWidth !== window.innerWidth ||
			viewportHeight !== window.innerHeight;
		viewportWidth = window.innerWidth;
		viewportHeight = window.innerHeight;
		if (!changed) return;
		moveTo(activeIndex, false);
	};
	measureHeader();
	activeIndex = nearest();
	main.setAttribute("data-landing-slideshow", "");
	const observer =
		typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onResize);
	for (const header of workspace.querySelectorAll(
		"[data-landing-scroll-start]",
	))
		observer?.observe(header);
	window.addEventListener("wheel", onWheel, { passive: false });
	window.addEventListener("keydown", onKeyDown);
	window.addEventListener("touchstart", onTouchStart, { passive: true });
	window.addEventListener("touchmove", onTouchMove, { passive: false });
	window.addEventListener("touchend", onTouchEnd, { passive: false });
	window.addEventListener("touchcancel", onTouchCancel);
	window.addEventListener("scroll", onScroll, { passive: true });
	window.addEventListener("resize", onResize);
	main.addEventListener(LANDING_SLIDE_REQUEST, onSectionRequest);
	return () => {
		disposed = true;
		animation?.stop();
		observer?.disconnect();
		window.clearTimeout(wheelTimer);
		window.clearTimeout(settleTimer);
		window.removeEventListener("wheel", onWheel);
		window.removeEventListener("keydown", onKeyDown);
		window.removeEventListener("touchstart", onTouchStart);
		window.removeEventListener("touchmove", onTouchMove);
		window.removeEventListener("touchend", onTouchEnd);
		window.removeEventListener("touchcancel", onTouchCancel);
		window.removeEventListener("scroll", onScroll);
		window.removeEventListener("resize", onResize);
		main.removeEventListener(LANDING_SLIDE_REQUEST, onSectionRequest);
		main.removeAttribute("data-landing-slideshow");
		if (previousHeaderHeight)
			workspace.style.setProperty(
				"--landing-header-height",
				previousHeaderHeight,
			);
		else workspace.style.removeProperty("--landing-header-height");
	};
}
