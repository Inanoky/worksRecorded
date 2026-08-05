"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/utils";

export function DefaultConstructionForma2TableScroll({
	children,
	className,
	label,
}: {
	children: ReactNode;
	className?: string;
	label: string;
}) {
	const contentRef = useRef<HTMLDivElement>(null);
	const scrollbarRef = useRef<HTMLDivElement>(null);
	const [scrollWidth, setScrollWidth] = useState(0);
	const [hasOverflow, setHasOverflow] = useState(false);

	useEffect(() => {
		const content = contentRef.current;
		if (!content) return;

		const updateSize = () => {
			setScrollWidth(content.scrollWidth);
			setHasOverflow(content.scrollWidth > content.clientWidth + 1);
		};

		const observer = new ResizeObserver(updateSize);
		observer.observe(content);
		if (content.firstElementChild instanceof HTMLElement) {
			observer.observe(content.firstElementChild);
		}
		window.addEventListener("resize", updateSize);
		updateSize();

		return () => {
			observer.disconnect();
			window.removeEventListener("resize", updateSize);
		};
	}, []);

	return (
		<div className={cn("relative", className)}>
			<div
				ref={scrollbarRef}
				data-slot="forma2-floating-scrollbar"
				aria-hidden="true"
				className={cn(
					"sticky top-[calc(100dvh-1rem)] z-30 h-4 overflow-x-scroll overscroll-x-contain border-y bg-background",
					!hasOverflow && "hidden",
				)}
				onScroll={(event) => {
					if (contentRef.current) {
						contentRef.current.scrollLeft = event.currentTarget.scrollLeft;
					}
				}}
			>
				<div className="h-px" style={{ width: scrollWidth }} />
			</div>
			<section
				ref={contentRef}
				aria-label={label}
				tabIndex={hasOverflow ? 0 : undefined}
				className="relative w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				onScroll={(event) => {
					if (scrollbarRef.current) {
						scrollbarRef.current.scrollLeft = event.currentTarget.scrollLeft;
					}
				}}
			>
				{children}
			</section>
		</div>
	);
}
