"use client";

import { Loader2, Plus } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { manualMaterialSchema } from "@/lib/bis/manual-material";

export function ManualWarehouseMaterial({
	siteId,
	onCreated,
}: {
	siteId: string;
	onCreated: () => void;
}) {
	const idPrefix = useId();
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const requestId = useRef("");
	const busy = useRef(false);
	return (
		<>
			<Button
				type="button"
				size="sm"
				variant="outline"
				onClick={() => {
					requestId.current = crypto.randomUUID();
					setError("");
					setOpen(true);
				}}
			>
				<Plus className="mr-2 size-4" />
				Pievienot materiālu
			</Button>
			<Dialog
				open={open}
				onOpenChange={(value) => {
					if (!busy.current) setOpen(value);
				}}
			>
				<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Pievienot materiālu</DialogTitle>
						<DialogDescription>
							Izveidojiet materiāla pozīciju projekta noliktavā. BIS
							konfigurāciju un Forma 2 pozīciju var piesaistīt pēc saglabāšanas.
						</DialogDescription>
					</DialogHeader>
					<form
						onSubmit={async (event) => {
							event.preventDefault();
							if (busy.current) return;
							const form = new FormData(event.currentTarget);
							const text = (key: string) => String(form.get(key) ?? "").trim();
							const decimal = (key: string) =>
								Number(text(key).replace(",", "."));
							const parsed = manualMaterialSchema.safeParse({
								id: requestId.current,
								siteId,
								name: text("name"),
								quantity: text("quantity") ? decimal("quantity") : Number.NaN,
								measurementUnit: text("measurementUnit"),
								cost: text("cost") ? decimal("cost") : null,
								materialDate: text("materialDate"),
								invoiceDate: text("invoiceDate") || null,
								invoiceNr: text("invoiceNr"),
								supplierName: text("supplierName"),
							});
							if (!parsed.success) {
								setError(
									parsed.error.issues[0]?.message ?? "Pārbaudiet datus.",
								);
								return;
							}
							busy.current = true;
							setSaving(true);
							setError("");
							try {
								const { saveManualWarehouseMaterial } = await import(
									"@/server/actions/manual-warehouse-material"
								);
								const saved = await saveManualWarehouseMaterial({
									...parsed.data,
									invoiceNr: parsed.data.invoiceNr ?? "",
									supplierName: parsed.data.supplierName ?? "",
								});
								if (!saved.ok) throw new Error(saved.error);
								setOpen(false);
								toast.success("Materiāls pievienots.");
								onCreated();
							} catch (failure) {
								setError(
									failure instanceof Error
										? failure.message
										: "Neizdevās saglabāt materiālu.",
								);
							} finally {
								busy.current = false;
								setSaving(false);
							}
						}}
					>
						<fieldset disabled={saving} className="grid grid-cols-2 gap-3">
							<label
								className="col-span-2 space-y-1 text-sm"
								htmlFor={`${idPrefix}-name`}
							>
								Materiāls
								<Input
									id={`${idPrefix}-name`}
									name="name"
									required
									maxLength={120}
									autoFocus
								/>
							</label>
							<label
								className="space-y-1 text-sm"
								htmlFor={`${idPrefix}-quantity`}
							>
								Daudzums
								<Input
									id={`${idPrefix}-quantity`}
									name="quantity"
									required
									inputMode="decimal"
								/>
							</label>
							<label
								className="space-y-1 text-sm"
								htmlFor={`${idPrefix}-measurementUnit`}
							>
								Mērvienība
								<Input
									id={`${idPrefix}-measurementUnit`}
									name="measurementUnit"
									required
									maxLength={20}
									placeholder="m², gab., kg…"
								/>
							</label>
							<label className="space-y-1 text-sm" htmlFor={`${idPrefix}-cost`}>
								Kopējās izmaksas, EUR
								<Input
									id={`${idPrefix}-cost`}
									name="cost"
									inputMode="decimal"
								/>
							</label>
							<label
								className="space-y-1 text-sm"
								htmlFor={`${idPrefix}-materialDate`}
							>
								Materiāla datums
								<Input
									id={`${idPrefix}-materialDate`}
									name="materialDate"
									type="date"
									required
									defaultValue={new Date().toLocaleDateString("sv-SE")}
								/>
							</label>
							<label
								className="col-span-2 space-y-1 text-sm"
								htmlFor={`${idPrefix}-supplierName`}
							>
								Piegādātājs
								<Input
									id={`${idPrefix}-supplierName`}
									name="supplierName"
									maxLength={200}
								/>
							</label>
							<label
								className="space-y-1 text-sm"
								htmlFor={`${idPrefix}-invoiceNr`}
							>
								Rēķina numurs
								<Input
									id={`${idPrefix}-invoiceNr`}
									name="invoiceNr"
									maxLength={120}
								/>
							</label>
							<label
								className="space-y-1 text-sm"
								htmlFor={`${idPrefix}-invoiceDate`}
							>
								Rēķina datums
								<Input
									id={`${idPrefix}-invoiceDate`}
									name="invoiceDate"
									type="date"
								/>
							</label>
						</fieldset>
						{error ? (
							<p role="alert" className="mt-3 text-sm text-destructive">
								{error}
							</p>
						) : null}
						<DialogFooter className="mt-4">
							<Button
								type="button"
								variant="outline"
								disabled={saving}
								onClick={() => setOpen(false)}
							>
								Atcelt
							</Button>
							<Button type="submit" disabled={saving}>
								{saving ? (
									<Loader2 className="mr-2 size-4 animate-spin" />
								) : null}
								{saving ? "Saglabā…" : "Pievienot materiālu"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}
