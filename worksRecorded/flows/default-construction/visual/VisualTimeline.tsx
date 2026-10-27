"use client";

import { ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
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
	onlySelectedDay = false,
	onOnlySelectedDay,
	compact = false,
	ariaLabel = "Darbu progress pa dienām",
	title = "Kumulatīvais darbu progress",
	dayPrefix = "Līdz",
	emptyLabel = "Nav datētu ierakstu",
	countLabel = (count) => `${count} zonas`,
	emptyHint = "Redzamas visas pieejamās zonas",
	sliderLabel = "Progresa datums",
}: {
	firstDay: number | null;
	lastDay: number | null;
	day: number | null;
	onChange: (day: number) => void;
	undatedCount: number;
	includeUndated: boolean;
	onIncludeUndated: (include: boolean) => void;
	visibleCount: number;
	onlySelectedDay?: boolean;
	onOnlySelectedDay?: (value: boolean) => void;
	compact?: boolean;
	ariaLabel?: string;
	title?: string;
	dayPrefix?: string;
	emptyLabel?: string;
	countLabel?: (count: number) => string;
	emptyHint?: string;
	sliderLabel?: string;
}) {
	const id = useId();
	if (compact)
		return (
			<section
				className="flex min-w-0 flex-wrap items-center gap-2 border-t bg-background px-3 py-2"
				aria-label={ariaLabel}
			>
				<Label htmlFor={id} className="sr-only">
					{title}
				</Label>
				<output className="shrink-0 text-xs tabular-nums" aria-live="polite">
					{day === null
						? emptyLabel
						: `${onlySelectedDay ? "Diena" : dayPrefix} ${formatVisualDay(day)}`}
					<span className="hidden text-muted-foreground md:inline">
						{" "}
						· {countLabel(visibleCount)}
					</span>
				</output>
				{firstDay !== null && lastDay !== null && day !== null ? (
					<>
						<Button
							size="icon"
							variant="ghost"
							className="h-7 w-7 shrink-0"
							aria-label="Iepriekšējā diena"
							disabled={day <= firstDay}
							onClick={() => onChange(day - 1)}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<div className="min-w-32 flex-1">
							<Input
								id={id}
								type="range"
								min={firstDay}
								max={lastDay}
								step={1}
								value={day}
								disabled={firstDay === lastDay}
								aria-label={sliderLabel}
								aria-valuetext={formatVisualDay(day)}
								className="h-7 w-full cursor-pointer border-0 bg-transparent px-0 accent-primary shadow-none disabled:cursor-default"
								onChange={(event) => onChange(Number(event.target.value))}
							/>
						</div>
						<Button
							size="icon"
							variant="ghost"
							className="h-7 w-7 shrink-0"
							aria-label="Nākamā diena"
							disabled={day >= lastDay}
							onClick={() => onChange(day + 1)}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
						<Button
							size="icon"
							variant="ghost"
							className="h-7 w-7 shrink-0"
							aria-label="Jaunākais datums"
							title="Jaunākais datums"
							disabled={day === lastDay}
							onClick={() => onChange(lastDay)}
						>
							<ChevronsRight className="h-4 w-4" />
						</Button>
					</>
				) : (
					<span className="min-w-0 flex-1 text-xs text-muted-foreground">
						{emptyHint}
					</span>
				)}
				{onOnlySelectedDay && day !== null ? (
					<label
						htmlFor={`${id}-day-only`}
						className="flex shrink-0 cursor-pointer items-center gap-2 text-xs"
					>
						<Checkbox
							id={`${id}-day-only`}
							checked={onlySelectedDay}
							onCheckedChange={(value) => onOnlySelectedDay(value === true)}
						/>
						Tikai izvēlētā diena
					</label>
				) : null}
				{undatedCount > 0 && day !== null ? (
					<label
						htmlFor={`${id}-undated`}
						className="flex shrink-0 cursor-pointer items-center gap-2 text-xs"
						title={`Rādīt arī zonas bez datuma (${undatedCount})`}
					>
						<Checkbox
							id={`${id}-undated`}
							checked={includeUndated}
							onCheckedChange={(checked) => onIncludeUndated(checked === true)}
						/>
						<span className="sr-only">
							Rādīt arī zonas bez datuma ({undatedCount})
						</span>
						<span aria-hidden="true" className="hidden sm:inline">
							Bez datuma ({undatedCount})
						</span>
					</label>
				) : null}
			</section>
		);
	return (
		<section
			className="space-y-3 rounded-md border bg-muted/40 p-4"
			aria-label={ariaLabel}
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<Label htmlFor={id}>{title}</Label>
				<output className="text-sm font-medium" aria-live="polite">
					{day === null ? emptyLabel : `${dayPrefix} ${formatVisualDay(day)}`} ·{" "}
					{countLabel(visibleCount)}
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
						aria-label={sliderLabel}
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
