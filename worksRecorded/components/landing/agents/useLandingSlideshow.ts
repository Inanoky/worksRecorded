"use client";

import { useEffect, useRef } from "react";
import { createLandingSlideshow } from "./landing-slideshow";

export function useLandingSlideshow() {
	const main = useRef<HTMLElement>(null);
	useEffect(() => {
		if (main.current) return createLandingSlideshow(main.current);
	}, []);
	return main;
}
