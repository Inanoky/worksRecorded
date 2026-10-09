"use client";

import { useLayoutEffect, useRef, useState } from "react";

export function useVisualWorkspace(active: boolean) {
	const workspace = useRef<HTMLElement>(null);
	const [height, setHeight] = useState<number | undefined>();
	useLayoutEffect(() => {
		const element = workspace.current;
		if (!active || !element) return;
		const measure = () => {
			let bottomSpace = 12;
			let ancestor = element.parentElement;
			while (ancestor) {
				const style = window.getComputedStyle(ancestor);
				bottomSpace +=
					(Number.parseFloat(style.paddingBottom) || 0) +
					(Number.parseFloat(style.borderBottomWidth) || 0) +
					(Number.parseFloat(style.marginBottom) || 0);
				ancestor = ancestor.parentElement;
			}
			setHeight(
				Math.max(
					160,
					window.innerHeight -
						Math.max(0, element.getBoundingClientRect().top) -
						bottomSpace,
				),
			);
		};
		measure();
		window.addEventListener("resize", measure);
		const observer =
			typeof ResizeObserver === "undefined"
				? null
				: new ResizeObserver(measure);
		let parent = element.parentElement;
		while (parent) {
			observer?.observe(parent);
			parent = parent.parentElement;
		}
		return () => {
			window.removeEventListener("resize", measure);
			observer?.disconnect();
		};
	}, [active]);
	return { workspace, height };
}
