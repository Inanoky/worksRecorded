"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	type DrawingPageMeasurement,
	parseDrawingScale,
	resolvedDrawingScale,
} from "./drawing-scale";

export function VisualDrawingScale({
	measurement,
	override,
	onChange,
}: {
	measurement?: DrawingPageMeasurement;
	override?: number;
	onChange?: (scale: number | null) => Promise<void>;
}) {
	const scale = resolvedDrawingScale(measurement, override);
	const [open, setOpen] = useState(false);
	const [value, setValue] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const id = useId();
	async function apply(next: number | null) {
		if (!onChange || saving) return;
		setSaving(true);
		setError(null);
		try {
			await onChange(next);
			setOpen(false);
		} catch (error) {
			setError(
				error instanceof Error ? error.message : "Neizdevās saglabāt mērogu.",
			);
		} finally {
			setSaving(false);
		}
	}
	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				if (saving) return;
				setOpen(next);
				setValue(scale ? `1:${scale}` : "");
				setError(null);
			}}
		>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					disabled={!measurement}
					aria-label="Rasējuma mērogs"
				>
					{!measurement
						? "Mēroga nolasīšana…"
						: scale
							? `Mērogs 1:${scale} · ${override ? "Norādīts" : "PDF"}`
							: measurement.scales.length > 1
								? "Vairāki mērogi · Izvēlēties"
								: "Mērogs nav atrasts · Norādīt"}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="z-[70] w-72 space-y-3"
				data-drawing-control
			>
				<p className="text-sm font-medium">Rasējuma lapas mērogs</p>
				<p className="text-xs text-muted-foreground">
					{measurement?.scales.length
						? `PDF atrasts: ${measurement.scales.map((scale) => `1:${scale}`).join(", ")}.`
						: "PDF tekstā mēroga apzīmējums nav atrasts."}
				</p>
				<Label htmlFor={id}>Mērogs</Label>
				<Input
					id={id}
					value={value}
					disabled={saving || !onChange}
					placeholder="1:100"
					onChange={(event) => setValue(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							const scale = parseDrawingScale(value);
							if (scale) void apply(scale);
							else setError("Norādiet mērogu, piemēram, 1:100.");
						}
					}}
				/>
				<div className="flex gap-2">
					<Button
						size="sm"
						disabled={saving || !onChange}
						onClick={() => {
							const scale = parseDrawingScale(value);
							if (scale) void apply(scale);
							else setError("Norādiet mērogu, piemēram, 1:100.");
						}}
					>
						{saving ? "Saglabā…" : "Lietot"}
					</Button>
					{override ? (
						<Button
							size="sm"
							variant="outline"
							disabled={saving}
							onClick={() => void apply(null)}
						>
							No PDF
						</Button>
					) : null}
				</div>
				{error ? (
					<p role="alert" className="text-xs text-destructive">
						{error}
					</p>
				) : null}
			</PopoverContent>
		</Popover>
	);
}
