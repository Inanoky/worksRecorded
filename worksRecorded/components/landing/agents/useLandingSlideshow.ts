"use client";

import { useEffect, useRef } from "react";
import { createLandingSlideshow } from "./landing-slideshow";

export function useLandingSlideshow() {
	const main = useRef<HTMLElement>(null);
	useEffect(() => {
		const mobile = window.matchMedia("(max-width: 1023px)");
		let stop: (() => void) | undefined;
		const update = () => {
			stop?.();
			stop = undefined;
			if (!mobile.matches && main.current)
				stop = createLandingSlideshow(main.current);
		};
		update();
		mobile.addEventListener("change", update);
		return () => {
			mobile.removeEventListener("change", update);
			stop?.();
		};
	}, []);
	return main;
}
