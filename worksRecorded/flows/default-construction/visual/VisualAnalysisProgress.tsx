"use client";

import { CheckCircle2, Circle, CircleAlert, Loader2 } from "lucide-react";
import type { VisualDrawing } from "./model";
import { VISUAL_LEASE_MS, visualImageProgress } from "./model";

export type VisualAnalysisPhase = "idle" | "upload" | "preparing" | "analyzing";

export function VisualAnalysisProgress({
	phase,
	drawing,
	uploadProgress,
	interrupted,
	progressUnavailable = false,
}: {
	phase: VisualAnalysisPhase;
	drawing: VisualDrawing | null;
	uploadProgress: number;
	interrupted: boolean;
	progressUnavailable?: boolean;
}) {
	const state = drawing?.state;
	const remoteActive =
		state?.status === "running" &&
		state.lockedAt !== null &&
		Date.now() - state.lockedAt < VISUAL_LEASE_MS;
	const active = phase !== "idle" || remoteActive;
	const total = state?.evidence.length ?? 0;
	const completed = Math.min(total, Math.max(0, state?.processed ?? 0));
	const items = state ? visualImageProgress(state) : [];
	const failed = items.filter((item) => item.status === "failed").length;
	const remaining = Math.max(0, total - completed - failed);
	if (!active && (!state || (remaining === 0 && failed === 0))) return null;
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
						{failed ? ` · Kļūdas: ${failed}` : ""}
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
					value={completed + failed}
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
							? "Visi nepabeigtie attēli tiek analizēti vienlaikus. Rezultāti un zonas parādās pakāpeniski; tas var aizņemt dažas minūtes."
							: "Saglabātie rezultāti ir pieejami. Nospiediet “Turpināt analīzi”, lai atkārtotu tikai nepabeigtos attēlus."}
			</p>
			{progressUnavailable ? (
				<output className="block text-xs text-muted-foreground">
					Neizdevās atjaunot progresu. Mēģinām atjaunot savienojumu; analīze
					serverī var turpināties.
				</output>
			) : null}
			{!isUpload && !preparing && items.length ? (
				<details className="text-sm" open={failed > 0 || undefined}>
					<summary className="cursor-pointer text-muted-foreground">
						Attēlu statuss ({total})
					</summary>
					<ul className="mt-2 max-h-56 divide-y overflow-y-auto">
						{items.map((item, index) => {
							const evidence = state?.evidence.find(
								(entry) => entry.id === item.evidenceId,
							);
							const unlocated = state?.unlocated.some(
								(entry) => entry.evidenceId === item.evidenceId,
							);
							const Icon =
								item.status === "complete"
									? CheckCircle2
									: item.status === "failed"
										? CircleAlert
										: item.status === "running" && active
											? Loader2
											: Circle;
							const label =
								item.status === "complete"
									? unlocated
										? "Nav izvietots"
										: "Pabeigts"
									: item.status === "failed"
										? "Kļūda"
										: item.status === "running" && active
											? "Analizē…"
											: "Gaida analīzi";
							return (
								<li key={item.evidenceId} className="py-2">
									<div className="flex items-center gap-2">
										<Icon
											aria-hidden="true"
											className={`h-4 w-4 shrink-0 ${item.status === "running" && active ? "animate-spin motion-reduce:animate-none" : ""} ${item.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}
										/>
										<span className="min-w-0 flex-1 break-words">
											{index + 1}. {evidence?.work}
										</span>
										<span className="shrink-0 text-xs text-muted-foreground">
											{label}
										</span>
									</div>
									{item.error ? (
										<p className="mt-1 pl-6 text-xs text-destructive">
											{item.error}
										</p>
									) : null}
								</li>
							);
						})}
					</ul>
				</details>
			) : null}
		</section>
	);
}
