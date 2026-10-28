"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { notifyDiaryRecordUpdated } from "../lib/diary-record-updated-event";
import { addVisualRecord, attachVisualRecord } from "./actions";
import type { VisualPlanArea } from "./planning-model";
import {
	type VisualRecordChoice,
	visualRecordAttachmentSchema,
	visualRecordInputSchema,
} from "./record-model";

type SavedRecord = {
	ok: true;
	drawing: import("./model").VisualDrawing;
	markId: string;
	recordId: string;
	assignmentWarning?: string;
};

export function VisualRecordForm({
	siteId,
	drawingId,
	recordId,
	location,
	areas,
	workOptions,
	records = [],
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
	records?: VisualRecordChoice[];
	hidden: boolean;
	onSavingChange: (saving: boolean) => void;
	onSaved: (result: SavedRecord) => void;
	onCancel: () => void;
}) {
	const formId = useId();
	const [mode, setMode] = useState<"new" | "existing">("new");
	const [query, setQuery] = useState("");
	const [existingId, setExistingId] = useState("");
	const selectedRecord = records.find((record) => record.id === existingId);
	const visibleRecords = records.filter((record) =>
		[record.work, record.date, record.location, record.originalMessage]
			.join(" ")
			.toLocaleLowerCase("lv")
			.includes(query.toLocaleLowerCase("lv")),
	);
	const attachment = visualRecordAttachmentSchema.safeParse({
		id: recordId,
		recordId: existingId,
		areas,
	});
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
		if (
			(mode === "new"
				? !parsed.success
				: !attachment.success || !selectedRecord) ||
			savingRef.current
		)
			return;
		savingRef.current = true;
		setSaving(true);
		onSavingChange(true);
		setError(null);
		try {
			const result =
				mode === "existing" && attachment.success
					? await attachVisualRecord(siteId, drawingId, attachment.data)
					: parsed.success
						? await addVisualRecord(siteId, drawingId, parsed.data)
						: null;
			if (!result) return;
			if (!mounted.current) return;
			if (result.ok) {
				if (mode === "new") notifyDiaryRecordUpdated(siteId);
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
				<h3 className="font-semibold">
					{mode === "new"
						? "Jauns izpildes ieraksts"
						: "Piesaistīt zonu ierakstam"}
				</h3>
				<div className="grid grid-cols-2 gap-2">
					<Button
						type="button"
						variant={mode === "new" ? "secondary" : "outline"}
						aria-pressed={mode === "new"}
						disabled={saving}
						onClick={() => setMode("new")}
					>
						Jauns ieraksts
					</Button>
					<Button
						type="button"
						variant={mode === "existing" ? "secondary" : "outline"}
						aria-pressed={mode === "existing"}
						disabled={saving}
						onClick={() => setMode("existing")}
					>
						Esošs ieraksts
					</Button>
				</div>
				<p className="text-sm text-muted-foreground">
					{location} · {areas.length} {areas.length === 1 ? "zona" : "zonas"}
				</p>
				<fieldset disabled={saving} className="space-y-3">
					{mode === "existing" ? (
						<>
							<Label htmlFor={`${formId}-search`}>Meklēt ierakstu</Label>
							<Input
								id={`${formId}-search`}
								value={query}
								onChange={(event) => {
									setQuery(event.target.value);
									setExistingId("");
								}}
								placeholder="Darbs, datums vai ziņojums"
							/>
							<Label htmlFor={`${formId}-record`}>Žurnāla ieraksts</Label>
							<select
								id={`${formId}-record`}
								className="w-full rounded-md border bg-background p-2 text-sm"
								size={6}
								value={existingId}
								onChange={(event) => setExistingId(event.target.value)}
							>
								{visibleRecords.map((record) => (
									<option key={record.id} value={record.id}>
										{record.date?.slice(0, 10) ?? "Bez datuma"} · {record.work}{" "}
										· {record.amount} {record.unit} ·{" "}
										{record.hasDrawing ? "Ir zona" : "Bez zonas"}
									</option>
								))}
							</select>
							{!visibleRecords.length ? (
								<p className="text-sm text-muted-foreground">
									Nav atbilstošu šīs lokācijas ierakstu.
								</p>
							) : null}
							{selectedRecord?.originalMessage ? (
								<p className="max-h-28 overflow-y-auto whitespace-pre-wrap text-xs text-muted-foreground">
									{selectedRecord.originalMessage}
								</p>
							) : null}
						</>
					) : (
						<>
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
						</>
					)}
				</fieldset>
				{error ? (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				) : null}
				<p className="text-xs text-muted-foreground">
					{mode === "new"
						? "Ieraksts tiks pievienots būvdarbu žurnālam un piesaistīts norādītajai zonai."
						: "Zona tiks pievienota izvēlētajam žurnāla ierakstam."}
				</p>
				<div className="flex gap-2">
					<Button
						type="submit"
						disabled={
							saving ||
							(mode === "new"
								? !parsed.success
								: !attachment.success || !selectedRecord)
						}
					>
						{saving
							? "Saglabā…"
							: mode === "new"
								? "Saglabāt ierakstu"
								: "Piesaistīt zonu"}
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
