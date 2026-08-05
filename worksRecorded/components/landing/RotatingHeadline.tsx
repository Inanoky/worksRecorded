"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/utils";

export function RotatingHeadline({ items }: { items: string[] }) {
	const [activeIndex, setActiveIndex] = useState(0);

	useEffect(() => {
		if (items.length < 2) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const interval = window.setInterval(() => {
			setActiveIndex((current) => (current + 1) % items.length);
		}, 2200);
		return () => window.clearInterval(interval);
	}, [items.length]);

	return (
		<h1
			className="mt-5 text-4xl font-semibold leading-none tracking-normal text-slate-950 sm:text-5xl md:text-7xl dark:text-white"
			aria-label={`WorksRecorded - ${items.join(", ")}`}
		>
			<span
				aria-hidden="true"
				className="flex flex-wrap justify-center gap-x-3"
			>
				<span>WorksRecorded -</span>
				<span className="inline-grid text-emerald-700 dark:text-emerald-400">
					{items.map((item, index) => (
						<span
							key={item}
							className={cn(
								"col-start-1 row-start-1 transition-opacity duration-200 motion-reduce:transition-none",
								index === activeIndex ? "opacity-100" : "opacity-0",
							)}
						>
							{item}
						</span>
					))}
				</span>
			</span>
		</h1>
	);
}
