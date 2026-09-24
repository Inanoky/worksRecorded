"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatVisualDay } from "./timeline";

export function VisualTimeline({
	firstDay,
	lastDay,
	day,
	onChange,
	undatedCount,
	includeUndated,
	onIncludeUndated,
	visibleCount,
}: {
	firstDay: number | null;
	lastDay: number | null;
	day: number | null;
	onChange: (day: number) => void;
	undatedCount: number;
	includeUndated: boolean;
	onIncludeUndated: (include: boolean) => void;
	visibleCount: number;
}) {
	const id = useId();
	return (
		<section
			className="space-y-3 rounded-md border bg-muted/40 p-4"
			aria-label="Darbu progress pa dienām"
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<Label htmlFor={id}>Kumulatīvais darbu progress</Label>
				<output className="text-sm font-medium" aria-live="polite">
					{day === null
						? "Nav datētu ierakstu"
						: `Līdz ${formatVisualDay(day)}`}{" "}
					· {visibleCount} zonas
				</output>
			</div>
			{firstDay !== null && lastDay !== null && day !== null ? (
				<>
					<Input
						id={id}
						type="range"
						min={firstDay}
						max={lastDay}
						step={1}
						value={day}
						disabled={firstDay === lastDay}
						aria-label="Progresa datums"
						aria-valuetext={formatVisualDay(day)}
						className="h-8 w-full cursor-pointer border-0 bg-transparent px-0 accent-primary shadow-none disabled:cursor-default"
						onChange={(event) => onChange(Number(event.target.value))}
					/>
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>{formatVisualDay(firstDay)}</span>
						<span>{formatVisualDay(lastDay)}</span>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							size="sm"
							variant="outline"
							disabled={day <= firstDay}
							onClick={() => onChange(day - 1)}
						>
							Iepriekšējā diena
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={day >= lastDay}
							onClick={() => onChange(day + 1)}
						>
							Nākamā diena
						</Button>
						<Button
							size="sm"
							variant="ghost"
							disabled={day === lastDay}
							onClick={() => onChange(lastDay)}
						>
							Jaunākais datums
						</Button>
					</div>
					<p className="text-xs text-muted-foreground">
						Redzami visi darbi līdz izvēlētajai dienai ieskaitot. Datums ņemts
						no žurnāla ieraksta (Latvijas laiks).
					</p>
				</>
			) : (
				<p className="text-xs text-muted-foreground">
					Lai izmantotu datumu slīdni, avota žurnāla ierakstiem nepieciešams
					datums. Pašlaik redzamas visas pieejamās zonas.
				</p>
			)}
			{undatedCount > 0 && day !== null ? (
				<div className="flex items-center gap-2">
					<Checkbox
						id={`${id}-undated`}
						checked={includeUndated}
						onCheckedChange={(checked) => onIncludeUndated(checked === true)}
					/>
					<Label htmlFor={`${id}-undated`}>
						Rādīt arī zonas bez datuma ({undatedCount})
					</Label>
				</div>
			) : null}
		</section>
	);
}
