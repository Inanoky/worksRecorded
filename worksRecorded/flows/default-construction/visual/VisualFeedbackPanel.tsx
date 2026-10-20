"use client";

import { X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";

export function VisualFeedbackPanel({
	visible,
	children,
}: {
	visible: boolean;
	children: ReactNode;
}) {
	const [dismissed, setDismissed] = useState(false);
	if (!visible) return null;
	if (dismissed)
		return (
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="absolute bottom-14 left-3 z-40 shadow-sm"
				aria-label="Rādīt analīzes paziņojumus"
				aria-expanded={false}
				onClick={() => setDismissed(false)}
			>
				Analīzes paziņojumi
			</Button>
		);
	return (
		<section
			aria-label="Analīzes paziņojumi"
			className="absolute bottom-14 left-3 right-16 z-40 max-h-[calc(100%-8rem)] max-w-xl space-y-2 overflow-y-auto rounded-lg border bg-background p-3 shadow-lg"
			onKeyDown={(event) => {
				if (event.key === "Escape" && !event.defaultPrevented) {
					event.stopPropagation();
					setDismissed(true);
				}
			}}
		>
			<div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-background">
				<span className="text-xs font-medium">Analīzes paziņojumi</span>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7 shrink-0"
					aria-label="Aizvērt analīzes paziņojumus"
					onClick={() => setDismissed(true)}
				>
					<X className="h-4 w-4" aria-hidden="true" />
				</Button>
			</div>
			{children}
		</section>
	);
}
