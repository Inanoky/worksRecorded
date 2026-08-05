"use client";

import { Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDefaultConstructionForma2ContractPosition } from "@/flows/default-construction/backend/forma2-analytics-actions";
import type { Forma2ResultRow } from "@/flows/default-construction/lib/forma2-analytics";
import { getForma2AnalyticsCopy } from "@/flows/default-construction/lib/forma2-analytics-copy";

type ContractFields = {
	plannedQuantity: string;
	plannedWorkCost: string;
	plannedMaterialCost: string;
	plannedMechanismCost: string;
	plannedTotalCost: string;
};

function numberValue(value: number | null) {
	return value == null ? "" : String(value);
}

function fieldsFromRow(row: Forma2ResultRow): ContractFields {
	return {
		plannedQuantity: numberValue(row.plannedQuantity),
		plannedWorkCost: numberValue(row.plannedWorkCost),
		plannedMaterialCost: numberValue(row.plannedMaterialCost),
		plannedMechanismCost: numberValue(row.plannedMechanismCost),
		plannedTotalCost: numberValue(row.plannedTotalCost),
	};
}

function parseNumber(value: string) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function roundedTotal(values: ContractFields) {
	const work = parseNumber(values.plannedWorkCost) ?? 0;
	const materials = parseNumber(values.plannedMaterialCost) ?? 0;
	const mechanisms = parseNumber(values.plannedMechanismCost) ?? 0;
	return Number((work + materials + mechanisms).toFixed(2));
}

export function DefaultConstructionForma2ContractEditor({
	siteId,
	row,
	organizationLanguage,
}: {
	siteId: string;
	row: Forma2ResultRow;
	organizationLanguage?: string | null;
}) {
	const t = getForma2AnalyticsCopy(organizationLanguage);
	const router = useRouter();
	const id = useId();
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [fields, setFields] = useState<ContractFields>(() =>
		fieldsFromRow(row),
	);

	const updateComponent = (
		field: "plannedWorkCost" | "plannedMaterialCost" | "plannedMechanismCost",
		value: string,
	) => {
		setFields((current) => {
			const next = { ...current, [field]: value };
			return { ...next, plannedTotalCost: String(roundedTotal(next)) };
		});
	};

	const save = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const quantity = fields.plannedQuantity.trim()
			? parseNumber(fields.plannedQuantity)
			: null;
		const work = parseNumber(fields.plannedWorkCost);
		const materials = parseNumber(fields.plannedMaterialCost);
		const mechanisms = parseNumber(fields.plannedMechanismCost);
		const total = parseNumber(fields.plannedTotalCost);
		if (
			(fields.plannedQuantity.trim() && (quantity == null || quantity < 0)) ||
			work == null ||
			materials == null ||
			mechanisms == null ||
			total == null
		) {
			toast.error(t.invalidContractValue);
			return;
		}
		setSaving(true);
		try {
			await updateDefaultConstructionForma2ContractPosition({
				siteId,
				positionId: row.id,
				plannedQuantity: quantity,
				plannedWorkCost: work,
				plannedMaterialCost: materials,
				plannedMechanismCost: mechanisms,
				plannedTotalCost: total,
			});
			setOpen(false);
			router.refresh();
			toast.success(t.contractUpdated);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t.saveError);
		} finally {
			setSaving(false);
		}
	};

	const inputFields = [
		{
			key: "plannedQuantity" as const,
			label: t.contractQuantity,
		},
		{ key: "plannedWorkCost" as const, label: t.plannedWork },
		{ key: "plannedMaterialCost" as const, label: t.plannedMaterials },
		{ key: "plannedMechanismCost" as const, label: t.plannedMechanisms },
	];

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (saving) return;
				if (nextOpen) setFields(fieldsFromRow(row));
				setOpen(nextOpen);
			}}
		>
			<DialogTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-7 shrink-0"
					title={t.editContract}
					aria-label={t.editContract}
				>
					<Pencil className="size-3.5" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-xl">
				<form onSubmit={save} className="contents">
					<DialogHeader>
						<DialogTitle>{t.editContractTitle}</DialogTitle>
						<DialogDescription>
							{row.code ? `${row.code} ` : ""}
							{row.name}. {t.editContractDescription}
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 sm:grid-cols-2">
						{inputFields.map((field) => {
							const inputId = `${id}-${field.key}`;
							return (
								<div key={field.key} className="space-y-2">
									<Label htmlFor={inputId}>{field.label}</Label>
									<Input
										id={inputId}
										type="number"
										min={field.key === "plannedQuantity" ? "0" : undefined}
										step="any"
										value={fields[field.key]}
										onChange={(event) => {
											const value = event.target.value;
											if (field.key === "plannedQuantity") {
												setFields((current) => ({
													...current,
													plannedQuantity: value,
												}));
											} else {
												updateComponent(field.key, value);
											}
										}}
										disabled={saving}
									/>
								</div>
							);
						})}
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor={`${id}-plannedTotalCost`}>{t.plannedTotal}</Label>
							<Input
								id={`${id}-plannedTotalCost`}
								type="number"
								step="any"
								value={fields.plannedTotalCost}
								onChange={(event) =>
									setFields((current) => ({
										...current,
										plannedTotalCost: event.target.value,
									}))
								}
								disabled={saving}
							/>
						</div>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="outline" disabled={saving}>
								{t.cancel}
							</Button>
						</DialogClose>
						<Button type="submit" disabled={saving}>
							{saving ? <Loader2 className="size-4 animate-spin" /> : null}
							{saving ? t.saving : t.save}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
