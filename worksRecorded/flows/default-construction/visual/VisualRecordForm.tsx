"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { notifyDiaryRecordUpdated } from "../lib/diary-record-updated-event";
import { addVisualRecord } from "./actions";
import type { VisualPlanArea } from "./planning-model";
import { visualRecordInputSchema } from "./record-model";

type SavedRecord = Extract<
	Awaited<ReturnType<typeof addVisualRecord>>,
	{ ok: true }
>;

export function VisualRecordForm({
	siteId,
	drawingId,
	recordId,
	location,
	areas,
	workOptions,
	hidden,
	onSavingChange,
	onSaved,
	onCancel,
}: {
	siteId: string;
	drawingId: string;
	recordId: string;
	location: string;
	areas: VisualPlanArea[];
	workOptions: string[];
	hidden: boolean;
	onSavingChange: (saving: boolean) => void;
	onSaved: (result: SavedRecord) => void;
	onCancel: () => void;
}) {
	const formId = useId();
	const [work, setWork] = useState("");
	const [date, setDate] = useState(() =>
		new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Riga" }).format(
			new Date(),
		),
	);
	const [quantity, setQuantity] = useState("");
	const [unit, setUnit] = useState("m2");
	const [comments, setComments] = useState("");
	const [saving, setSaving] = useState(false);
	const savingRef = useRef(false);
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	const [error, setError] = useState<string | null>(null);
	const parsed = visualRecordInputSchema.safeParse({
		id: recordId,
		date,
		work,
		quantity: Number(quantity),
		unit,
		comments,
		areas,
	});
	async function save() {
		if (!parsed.success || savingRef.current) return;
		savingRef.current = true;
		setSaving(true);
		onSavingChange(true);
		setError(null);
		try {
			const result = await addVisualRecord(siteId, drawingId, parsed.data);
			if (!mounted.current) return;
			if (result.ok) {
				notifyDiaryRecordUpdated(siteId);
				onSaved(result);
			} else setError(result.error);
		} catch {
			if (!mounted.current) return;
			setError(
				"Neizdevās saglabāt ierakstu. Pārbaudiet savienojumu un mēģiniet vēlreiz.",
			);
		} finally {
			savingRef.current = false;
			if (mounted.current) {
				setSaving(false);
				onSavingChange(false);
			}
		}
	}
	return (
		<aside
			hidden={hidden}
			inert={hidden}
			aria-label="Jauns izpildes ieraksts"
			className="absolute bottom-14 right-3 top-16 z-40 w-[min(380px,calc(100%-1.5rem))] overflow-y-auto rounded-xl border bg-background p-4 shadow-xl"
		>
			<form
				className="space-y-3"
				onSubmit={(event) => {
					event.preventDefault();
					void save();
				}}
			>
				<h3 className="font-semibold">Jauns izpildes ieraksts</h3>
				<p className="text-sm text-muted-foreground">
					{location} · {areas.length} {areas.length === 1 ? "zona" : "zonas"}
				</p>
				<fieldset disabled={saving} className="space-y-3">
					<div className="space-y-1">
						<Label htmlFor={`${formId}-work`}>Darbs</Label>
						<Input
							id={`${formId}-work`}
							list={`${formId}-works`}
							value={work}
							onChange={(event) => setWork(event.target.value)}
							required
							maxLength={500}
						/>
						<datalist id={`${formId}-works`}>
							{workOptions.map((option) => (
								<option key={option} value={option} />
							))}
						</datalist>
					</div>
					<div className="space-y-1">
						<Label htmlFor={`${formId}-date`}>Izpildes datums</Label>
						<Input
							id={`${formId}-date`}
							type="date"
							value={date}
							onChange={(event) => setDate(event.target.value)}
							required
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<Label htmlFor={`${formId}-quantity`}>Daudzums</Label>
							<Input
								id={`${formId}-quantity`}
								type="number"
								min="0"
								step="any"
								value={quantity}
								onChange={(event) => setQuantity(event.target.value)}
								required
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor={`${formId}-unit`}>Mērvienība</Label>
							<Input
								id={`${formId}-unit`}
								value={unit}
								onChange={(event) => setUnit(event.target.value)}
								maxLength={40}
								required
							/>
						</div>
					</div>
					<div className="space-y-1">
						<Label htmlFor={`${formId}-comments`}>Komentāri</Label>
						<Textarea
							id={`${formId}-comments`}
							value={comments}
							onChange={(event) => setComments(event.target.value)}
							maxLength={5000}
						/>
					</div>
				</fieldset>
				{error ? (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				) : null}
				<p className="text-xs text-muted-foreground">
					Ieraksts tiks pievienots būvdarbu žurnālam un piesaistīts norādītajai
					zonai.
				</p>
				<div className="flex gap-2">
					<Button type="submit" disabled={saving || !parsed.success}>
						{saving ? "Saglabā…" : "Saglabāt ierakstu"}
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={saving}
						onClick={onCancel}
					>
						Atcelt
					</Button>
				</div>
			</form>
		</aside>
	);
}
