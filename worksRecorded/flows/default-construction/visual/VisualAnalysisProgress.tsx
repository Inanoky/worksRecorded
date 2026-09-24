"use client";

import { Loader2 } from "lucide-react";
import type { VisualDrawing } from "./model";
import { VISUAL_BATCH_SIZE, VISUAL_LEASE_MS } from "./model";

export type VisualAnalysisPhase = "idle" | "upload" | "preparing" | "analyzing";

export function VisualAnalysisProgress({
	phase,
	drawing,
	uploadProgress,
	interrupted,
}: {
	phase: VisualAnalysisPhase;
	drawing: VisualDrawing | null;
	uploadProgress: number;
	interrupted: boolean;
}) {
	const state = drawing?.state;
	const remoteActive =
		state?.status === "running" &&
		state.lockedAt !== null &&
		Date.now() - state.lockedAt < VISUAL_LEASE_MS;
	const active = phase !== "idle" || remoteActive;
	const total = state?.evidence.length ?? 0;
	const completed = Math.min(total, Math.max(0, state?.processed ?? 0));
	const remaining = total - completed;
	if (!active && (!state || remaining === 0)) return null;
	const isUpload = phase === "upload";
	const preparing = phase === "preparing" || (!state && phase === "analyzing");
	const title = isUpload
		? "Augšupielādē PDF…"
		: preparing
			? "Sagatavo attēlu analīzi…"
			: active
				? "Analizē attēlus…"
				: interrupted || state?.status === "failed"
					? "Analīze pārtraukta"
					: "Analīze nav pabeigta";
	return (
		<section
			className="space-y-3 rounded-md border bg-muted/40 p-4"
			aria-label="Attēlu analīzes progress"
		>
			<output
				className="flex flex-wrap items-center justify-between gap-3 text-sm"
				aria-live="polite"
			>
				<span className="flex items-center gap-2 font-medium">
					{active ? (
						<Loader2
							aria-hidden="true"
							className="h-4 w-4 animate-spin motion-reduce:animate-none"
						/>
					) : null}
					{title}
				</span>
				{!isUpload && !preparing && state ? (
					<span className="tabular-nums">
						Analizēti {completed} no {total} · Atlikušie attēli: {remaining}
					</span>
				) : null}
			</output>
			{isUpload ? (
				<progress
					className="h-2 w-full accent-primary"
					aria-label="PDF augšupielāde"
					max={100}
					value={uploadProgress}
				/>
			) : !preparing && total > 0 ? (
				<progress
					className="h-2 w-full accent-primary"
					aria-label="Analizētie attēli"
					max={total}
					value={completed}
				/>
			) : (
				<progress
					className="h-2 w-full accent-primary"
					aria-label="Sagatavo analīzi"
				/>
			)}
			<p className="text-xs text-muted-foreground">
				{isUpload
					? `${uploadProgress}% augšupielādēts`
					: preparing
						? "Ielādē rasējumu un atlasa avota attēlus."
						: active
							? `Pašlaik apstrādā līdz ${Math.min(VISUAL_BATCH_SIZE, remaining)} attēliem. Skaits atjaunojas pēc katras grupas; tas var aizņemt dažas minūtes.`
							: "Saglabātie rezultāti ir pieejami. Nospiediet “Turpināt analīzi”, lai apstrādātu atlikušos attēlus."}
			</p>
		</section>
	);
}
