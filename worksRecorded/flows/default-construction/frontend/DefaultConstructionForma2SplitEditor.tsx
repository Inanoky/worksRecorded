"use client";

import { Loader2, Plus, Scissors, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	getDefaultConstructionForma2SplitDetails,
	saveDefaultConstructionForma2Split,
} from "../backend/forma2-analytics-actions";
import { calculateForma2Split, type Forma2Split } from "../lib/forma2-splits";
import { DefaultConstructionForma2AssignmentSelect } from "./DefaultConstructionForma2AssignmentSelect";

type Details = Awaited<
	ReturnType<typeof getDefaultConstructionForma2SplitDetails>
>;
type Draft = { id: string; positionId: string; value: string };

export function DefaultConstructionForma2SplitEditor({
	siteId,
	sourceId,
	isSplit = false,
	organizationLanguage,
	onSaved,
	disabled = false,
}: {
	siteId: string;
	sourceId: string;
	isSplit?: boolean;
	organizationLanguage?: string | null;
	onSaved: () => void | Promise<void>;
	disabled?: boolean;
}) {
	const lv =
		!organizationLanguage ||
		organizationLanguage.toLowerCase().startsWith("lv");
	const t = lv
		? {
				split: "Sadalīt",
				edit: "Rediģēt sadalījumu",
				title: "Rēķina pozīcijas sadalījums",
				description:
					"Sadaliet materiāla patēriņu un izmaksas starp tāmes pozīcijām. Oriģinālais rēķins un paveikto darbu daudzumi netiek mainīti.",
				quantity: "Daudzums",
				contractQuantity: "Līguma daudzums",
				percent: "Procenti",
				cost: "Summa (EUR)",
				mode: "Sadalīt pēc",
				add: "Pievienot pozīciju",
				remove: "Noņemt",
				save: "Saglabāt",
				cancel: "Atcelt",
				total: "Rēķina pozīcija",
				remainder: "Nav piesaistīts",
				allocated: "Piesaistīts",
				invalid:
					"Izvēlieties atšķirīgas pozīcijas un pozitīvas vērtības; kopsumma nedrīkst pārsniegt rēķina daudzumu vai summu.",
				error: "Neizdevās ielādēt vai saglabāt sadalījumu.",
				saved: "Sadalījums saglabāts.",
			}
		: {
				split: "Split",
				edit: "Edit split",
				title: "Invoice-line allocation",
				description:
					"Split material consumption and cost between estimate positions. The original invoice and completed-work quantities remain unchanged.",
				quantity: "Quantity",
				contractQuantity: "Contract quantity",
				percent: "Percentage",
				cost: "Amount (EUR)",
				mode: "Split by",
				add: "Add position",
				remove: "Remove",
				save: "Save",
				cancel: "Cancel",
				total: "Invoice line",
				remainder: "Unallocated",
				allocated: "Allocated",
				invalid:
					"Choose distinct positions and positive values; allocations must not exceed the invoice quantity or cost.",
				error: "Could not load or save the split.",
				saved: "Split saved.",
			};
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [details, setDetails] = useState<Details | null>(null);
	const [mode, setMode] = useState<Forma2Split["mode"]>("quantity");
	const [rows, setRows] = useState<Draft[]>([]);
	const number = (value: number) =>
		new Intl.NumberFormat(lv ? "lv-LV" : "en-GB", {
			maximumFractionDigits: 6,
		}).format(value);
	const money = (value: number) =>
		new Intl.NumberFormat(lv ? "lv-LV" : "en-GB", {
			style: "currency",
			currency: "EUR",
		}).format(value);
	const contractQuantity = (positionId: string) => {
		const position = details?.positionOptions.find(
			(item) => item.id === positionId,
		);
		return position?.plannedQuantity == null
			? "—"
			: `${number(position.plannedQuantity)} ${position.unit}`.trim();
	};
	const split: Forma2Split = {
		mode,
		parts: rows.map((row) => ({
			positionId: row.positionId,
			value: Number(row.value.replace(",", ".")),
		})),
	};
	let preview: ReturnType<typeof calculateForma2Split> | null = null;
	try {
		if (details) preview = calculateForma2Split(split, details.source);
	} catch {}
	const show = async () => {
		setOpen(true);
		setLoading(true);
		setDetails(null);
		try {
			const data = await getDefaultConstructionForma2SplitDetails({
				siteId,
				sourceId,
			});
			setDetails(data);
			const initialMode =
				data.split?.mode ??
				((data.source.quantity ?? 0) > 0 ? "quantity" : "percent");
			setMode(initialMode);
			setRows(
				(
					data.split?.parts ?? [
						{
							positionId: data.positionId ?? "",
							value:
								initialMode === "quantity" ? (data.source.quantity ?? 0) : 100,
						},
					]
				).map((part) => ({
					...part,
					id: crypto.randomUUID(),
					value: String(part.value),
				})),
			);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t.error);
			setOpen(false);
		} finally {
			setLoading(false);
		}
	};
	const save = async () => {
		if (!details || !preview || saving) return;
		setSaving(true);
		try {
			await saveDefaultConstructionForma2Split({
				siteId,
				sourceId,
				split,
				expectedAllocation: details.expectedAllocation,
				expectedQuantity: details.source.quantity,
				expectedCost: details.source.actualCost,
			});
			toast.success(t.saved);
			setOpen(false);
			await onSaved();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t.error);
		} finally {
			setSaving(false);
		}
	};
	const changeMode = (next: Forma2Split["mode"]) => {
		const denominator = (value: Forma2Split["mode"]) =>
			value === "percent"
				? 100
				: value === "quantity"
					? (details?.source.quantity ?? 0)
					: (details?.source.actualCost ?? 0);
		const oldTotal = denominator(mode);
		const nextTotal = denominator(next);
		setRows((current) =>
			current.map((row) => ({
				...row,
				value:
					oldTotal > 0
						? String(
								Number(
									(
										(Number(row.value.replace(",", ".")) / oldTotal) *
										nextTotal
									).toFixed(next === "cost" ? 2 : 6),
								),
							)
						: "",
			})),
		);
		setMode(next);
	};
	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={show}
				disabled={disabled}
			>
				<Scissors className="mr-2 size-4" />
				{isSplit ? t.edit : t.split}
			</Button>
			<Dialog
				open={open}
				onOpenChange={(next) => {
					if (!saving) setOpen(next);
				}}
			>
				<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
					<DialogHeader>
						<DialogTitle>{t.title}</DialogTitle>
						<DialogDescription>{t.description}</DialogDescription>
					</DialogHeader>
					{loading ? (
						<Loader2
							aria-label={t.title}
							className="mx-auto my-8 size-6 animate-spin"
						/>
					) : details ? (
						<>
							<div className="rounded-md bg-muted p-3 text-sm">
								<p className="font-medium">{details.source.label}</p>
								<p>
									{t.total}:{" "}
									{details.source.quantity == null
										? "—"
										: `${number(details.source.quantity)} ${details.source.unit}`}{" "}
									·{" "}
									{details.source.actualCost == null
										? "—"
										: money(details.source.actualCost)}
								</p>
							</div>
							<Select value={mode} onValueChange={changeMode} disabled={saving}>
								<SelectTrigger aria-label={t.mode} className="w-full sm:w-56">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem
										value="quantity"
										disabled={
											!(details.source.quantity && details.source.quantity > 0)
										}
									>
										{t.quantity} ({details.source.unit})
									</SelectItem>
									<SelectItem value="percent">{t.percent}</SelectItem>
									<SelectItem
										value="cost"
										disabled={
											!(
												details.source.actualCost &&
												details.source.actualCost > 0
											)
										}
									>
										{t.cost}
									</SelectItem>
								</SelectContent>
							</Select>
							<div className="space-y-3">
								{rows.map((row, index) => (
									<div
										key={row.id}
										className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_120px_90px_36px]"
									>
										<div className="col-span-2 min-w-0 sm:col-span-1">
											<DefaultConstructionForma2AssignmentSelect
												siteId={siteId}
												sourceId={sourceId}
												value={row.positionId || null}
												options={details.positionOptions}
												organizationLanguage={organizationLanguage}
												allowUnassigned={false}
												disabled={saving}
												onAssigned={() => {}}
												onChoose={(positionId) =>
													setRows((current) =>
														current.map((item) =>
															item.id === row.id
																? { ...item, positionId: positionId ?? "" }
																: item,
														),
													)
												}
											/>
											{row.positionId ? (
												<p className="mt-2 text-xs text-muted-foreground tabular-nums">
													{t.contractQuantity}:{" "}
													{contractQuantity(row.positionId)}
												</p>
											) : null}
										</div>
										<Input
											aria-label={`${t[mode]} ${index + 1}`}
											inputMode="decimal"
											value={row.value}
											disabled={saving}
											onChange={(event) =>
												setRows((current) =>
													current.map((item) =>
														item.id === row.id
															? { ...item, value: event.target.value }
															: item,
													),
												)
											}
										/>
										<span className="self-center text-right text-sm tabular-nums">
											{preview ? money(preview.parts[index].actualCost) : "—"}
										</span>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											aria-label={`${t.remove} ${index + 1}`}
											disabled={saving || rows.length === 1}
											onClick={() =>
												setRows((current) =>
													current.filter((item) => item.id !== row.id),
												)
											}
										>
											<Trash2 className="size-4" />
										</Button>
									</div>
								))}
							</div>
							<Button
								type="button"
								variant="outline"
								className="justify-self-start"
								disabled={saving || rows.length >= 50}
								onClick={() =>
									setRows((current) => [
										...current,
										{
											id: crypto.randomUUID(),
											positionId: "",
											value:
												preview && preview.remainingValue > 0
													? String(preview.remainingValue)
													: "",
										},
									])
								}
							>
								<Plus className="mr-2 size-4" />
								{t.add}
							</Button>
							{preview ? (
								<div
									className="rounded-md bg-muted p-3 text-sm"
									aria-live="polite"
								>
									<p>
										{t.allocated}:{" "}
										{money(
											(details.source.actualCost ?? 0) - preview.remainingCost,
										)}
									</p>
									<p>
										{t.remainder}: {money(preview.remainingCost)}
										{preview.remainingQuantity == null
											? ""
											: ` · ${number(preview.remainingQuantity)} ${details.source.unit}`}
									</p>
								</div>
							) : (
								<p role="alert" className="text-sm text-destructive">
									{t.invalid}
								</p>
							)}
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									disabled={saving}
									onClick={() => setOpen(false)}
								>
									{t.cancel}
								</Button>
								<Button
									type="button"
									disabled={saving || !preview}
									onClick={save}
								>
									{saving ? (
										<Loader2 className="mr-2 size-4 animate-spin" />
									) : null}
									{t.save}
								</Button>
							</div>
						</>
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}
