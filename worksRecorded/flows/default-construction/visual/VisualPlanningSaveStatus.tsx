"use client";

import { Button } from "@/components/ui/button";
import type {
	PlanningSaveItem,
	PlanningSaveQueue,
} from "./planning-save-queue";

export function VisualPlanningSaveStatus({
	queue,
	items,
	onDiscard,
}: {
	queue: PlanningSaveQueue;
	items: PlanningSaveItem[];
	onDiscard: (drawingId: string) => void;
}) {
	if (!items.length) return null;
	return (
		<div className="border-b bg-amber-50 px-3 py-2 text-xs" aria-live="polite">
			<p>Saglabāts šajā cilnē · serverī vēl nav apstiprināts: {items.length}</p>
			{items
				.filter((item) => item.status === "failed")
				.map((item) => (
					<div
						key={item.id}
						className="mt-1 flex flex-wrap items-center gap-2"
						role="alert"
					>
						<span>
							{item.plan.location} · {item.plan.work}: {item.error}
						</span>
						<Button
							size="sm"
							variant="outline"
							onClick={() => queue.retry(item.id)}
						>
							Mēģināt vēlreiz
						</Button>
						<Button
							size="sm"
							variant="ghost"
							onClick={() => {
								queue.discard(item.id);
								onDiscard(item.input.drawingId);
							}}
						>
							Atmest lokālo labojumu
						</Button>
					</div>
				))}
		</div>
	);
}
