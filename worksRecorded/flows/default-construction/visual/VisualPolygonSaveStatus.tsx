"use client";

import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
	PolygonSaveItem,
	PolygonSaveSnapshot,
} from "./polygon-save-queue";

export function VisualPolygonSaveStatus({
	state,
	label,
	onRetry,
	onDiscard,
	locked,
}: {
	state: PolygonSaveSnapshot;
	label: (item: PolygonSaveItem) => string;
	onRetry: (item: PolygonSaveItem) => void;
	onDiscard: (item: PolygonSaveItem) => void;
	locked: boolean;
}) {
	const failed = state.items.filter((item) => item.status === "failed");
	const pending = state.items.length - failed.length;
	if (!state.items.length && !state.lastSavedAt) return null;
	return (
		<div className="pointer-events-none absolute bottom-3 right-16 z-40 flex max-h-[calc(100%-1.5rem)] max-w-[min(380px,calc(100%-5rem))] flex-col gap-2">
			{failed.length ? (
				<div
					className="pointer-events-auto min-h-0 space-y-3 overflow-y-auto rounded-lg border border-destructive/40 bg-background p-3 shadow-lg"
					role="alert"
				>
					<p className="text-xs font-medium text-destructive">
						Nesaglabāti zonu labojumi: {failed.length}
					</p>
					{failed.slice(0, 3).map((item) => (
						<div
							key={`${item.drawingId}:${item.edit.markId}`}
							className="space-y-2 text-xs"
						>
							<p className="break-words font-medium">{label(item)}</p>
							<p className="text-muted-foreground">{item.error}</p>
							<div className="flex flex-wrap gap-2">
								<Button
									size="sm"
									variant="outline"
									className="h-7 text-xs"
									disabled={item.code === "conflict"}
									aria-label={`Mēģināt vēlreiz: ${label(item)}`}
									onClick={() => onRetry(item)}
								>
									Mēģināt vēlreiz
								</Button>
								<Button
									size="sm"
									variant="ghost"
									className="h-7 text-xs"
									disabled={locked}
									aria-label={`Atcelt labojumu: ${label(item)}`}
									onClick={() => onDiscard(item)}
								>
									Atcelt un atjaunot
								</Button>
							</div>
						</div>
					))}
					{failed.length > 3 ? (
						<p className="text-xs text-muted-foreground">
							Vēl {failed.length - 3} labojumi. Vispirms pārskatiet redzamos.
						</p>
					) : null}
				</div>
			) : null}
			<output
				aria-live="polite"
				className="ml-auto flex w-fit shrink-0 items-center gap-2 rounded-md border bg-background/95 px-3 py-2 text-xs shadow-sm"
			>
				{pending ? (
					<>
						<Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
						Saglabā zonas… {pending}
					</>
				) : failed.length ? (
					"Labojumi vēl nav saglabāti"
				) : (
					<>
						<Check className="h-3.5 w-3.5 text-primary" />
						Zonas saglabātas
					</>
				)}
			</output>
		</div>
	);
}
