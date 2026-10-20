"use client";

import { type ComponentProps, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";

export function DiaryFilterCard({
	sticky = false,
	className,
	...props
}: ComponentProps<typeof Card> & { sticky?: boolean }) {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!sticky) return;
		const header = document.querySelector("[data-dashboard-header]");
		if (!header) return;
		const measure = () => {
			ref.current?.style.setProperty(
				"--diary-filter-top",
				`${header.getBoundingClientRect().height + 8}px`,
			);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(header);
		return () => observer.disconnect();
	}, [sticky]);
	return (
		<Card
			{...props}
			ref={ref}
			role={sticky ? "region" : undefined}
			aria-label={sticky ? "Žurnāla filtri" : undefined}
			className={cn(
				className,
				sticky &&
					"sticky top-[var(--diary-filter-top,7.5rem)] z-30 max-h-[min(65dvh,calc(100dvh_-_var(--diary-filter-top,7.5rem)_-_1rem))] overflow-y-auto overscroll-contain !bg-background shadow-md",
			)}
		/>
	);
}
