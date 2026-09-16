"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import type { Comparison } from "./model";

type Alignment = "left" | "center" | "right";
const alignmentClasses: Record<Alignment, string> = {
	left: "text-left",
	center: "text-center",
	right: "text-right",
};
const defaultAlignment = (field: string): Alignment =>
	["Units", "Amounts", "WorkersInvolved", "TimeInvolved"].includes(field)
		? "center"
		: "left";
const planCellClass = "align-top px-3 py-3 whitespace-normal break-words";

export const planStatusLabels = {
	over: "Plāns pārsniegts",
	under: "Plāns nav sasniegts",
	equal: "Plāns izpildīts",
	unknown: "Nav faktiskā daudzuma",
	future: "Plānots",
	unplanned: "Neplānots darbs",
};

export function planTone(row?: Comparison) {
	return row?.status === "over"
		? "bg-green-50 hover:bg-green-100 dark:bg-green-950/30"
		: row?.status === "under"
			? "bg-red-50 hover:bg-red-100 dark:bg-red-950/30"
			: "";
}

export function DayPlanToggle({
	checked,
	onChange,
	date,
}: {
	checked: boolean;
	onChange: (value: boolean) => void;
	date: string;
}) {
	const id = useId();
	return (
		<label htmlFor={id} className="flex items-center gap-2 text-sm">
			<Checkbox
				id={id}
				checked={checked}
				onCheckedChange={(value) => onChange(value === true)}
				aria-label={`Rādīt plānu ${date}`}
			/>
			Rādīt plānu
		</label>
	);
}

export function PlanColumnHead({
	field,
	align = defaultAlignment(field),
}: {
	field: string;
	align?: Alignment;
}) {
	if (field !== "Works" && field !== "Amounts") return null;
	return (
		<TableHead
			className={`whitespace-normal align-middle ${alignmentClasses[align]}`}
			style={{ width: field === "Works" ? 200 : 125 }}
		>
			{field === "Works" ? "Plānotie darbi" : "Daudzums (plāns)"}
		</TableHead>
	);
}

export function PlanTableColumns({
	fields,
	bisEnabled,
}: {
	fields: string[];
	bisEnabled: boolean;
}) {
	const weights: Record<string, number> = {
		createdAt: 5,
		Location: 8,
		Works: 13,
		Units: 4,
		Amounts: 7,
		WorkersInvolved: 5,
		TimeInvolved: 5,
		Comments: 17,
	};
	const columns = [{ key: "select", weight: 3 }];
	for (const field of fields) {
		if (field === "Works" || field === "Amounts")
			columns.push({ key: `plan-${field}`, weight: weights[field] });
		columns.push({ key: field, weight: weights[field] ?? 7 });
		if (field === "TimeInvolved")
			columns.push({ key: "man-hours", weight: 6 }, { key: "cost", weight: 7 });
	}
	if (bisEnabled)
		columns.push({ key: "bis", weight: 7 }, { key: "status", weight: 7 });
	columns.push({ key: "action", weight: 4 }, { key: "source", weight: 4 });
	const total = columns.reduce((sum, column) => sum + column.weight, 0);
	return (
		<colgroup>
			{columns.map((column) => (
				<col
					key={column.key}
					style={{ width: `${(column.weight / total) * 100}%` }}
				/>
			))}
		</colgroup>
	);
}

export function PlanColumnCell({
	field,
	row,
	repeated = false,
	align = defaultAlignment(field),
}: {
	field: string;
	row?: Comparison;
	repeated?: boolean;
	align?: Alignment;
}) {
	if (field !== "Works" && field !== "Amounts") return null;
	return (
		<TableCell className={`${planCellClass} ${alignmentClasses[align]}`}>
			{repeated ? (
				<span className="text-xs text-muted-foreground">
					Kopīgs dienas plāns
				</span>
			) : field === "Works" ? (
				(row?.plan?.work ?? "—")
			) : (
				(row?.plan?.quantity ?? "—")
			)}
			{field === "Amounts" && row ? (
				<div className="mt-1 text-[10px] text-muted-foreground">
					{planStatusLabels[row.status]}
					{row.actualIds.length > 1 ? (
						<div>
							Dienā kopā: {row.actualQuantity ?? "—"} {row.unit}
						</div>
					) : null}
				</div>
			) : null}
		</TableCell>
	);
}

export function MobilePlan({
	row,
	actualWork,
	actualQuantity,
	unit,
}: {
	row?: Comparison;
	actualWork?: string | null;
	actualQuantity?: number | string | null;
	unit?: string | null;
}) {
	return (
		<div className="my-2 grid grid-cols-2 gap-3 border-y py-2 text-xs">
			<div className="min-w-0 space-y-1">
				<p className="font-semibold">Plānotie darbi</p>
				<p className="break-words">{row?.plan?.work ?? "—"}</p>
				<p>
					Daudzums (plāns):{" "}
					{row?.plan ? `${row.plan.quantity} ${row.unit}` : "—"}
				</p>
			</div>
			<div className="min-w-0 space-y-1">
				<p className="font-semibold">Darbi</p>
				<p className="break-words">{actualWork || "—"}</p>
				<p>
					Daudzums:{" "}
					{actualQuantity == null ? "—" : `${actualQuantity} ${unit ?? ""}`}
				</p>
			</div>
			<p className="col-span-2 font-medium">
				{planStatusLabels[row?.status ?? "unplanned"]}
				{row && row.actualIds.length > 1
					? ` · Dienā kopā: ${row.actualQuantity ?? "—"} ${row.unit}`
					: ""}
			</p>
		</div>
	);
}

export function PlanOnlyRow({
	row,
	fields,
	bisEnabled,
	getAlignment = defaultAlignment,
}: {
	row: Comparison;
	fields: string[];
	bisEnabled: boolean;
	getAlignment?: (field: string) => Alignment;
}) {
	return (
		<TableRow
			className={planTone(row)}
			aria-label={planStatusLabels[row.status]}
		>
			<TableCell className={`${planCellClass} text-center`}>—</TableCell>
			{fields.map((field) => (
				<PlanOnlyCells
					key={field}
					field={field}
					row={row}
					align={getAlignment(field)}
				/>
			))}
			{bisEnabled ? (
				<>
					<TableCell className={`${planCellClass} text-center`}>—</TableCell>
					<TableCell className={`${planCellClass} text-center`}>—</TableCell>
				</>
			) : null}
			<TableCell className={`${planCellClass} text-center`}>—</TableCell>
			<TableCell className={`${planCellClass} text-center`}>—</TableCell>
		</TableRow>
	);
}

function PlanOnlyCells({
	field,
	row,
	align,
}: {
	field: string;
	row: Comparison;
	align: Alignment;
}) {
	return (
		<>
			<PlanColumnCell field={field} row={row} align={align} />
			<TableCell className={`${planCellClass} ${alignmentClasses[align]}`}>
				{field === "Location"
					? row.location
					: field === "Units"
						? row.unit
						: "—"}
			</TableCell>
			{field === "TimeInvolved" ? (
				<>
					<TableCell className={`${planCellClass} text-center tabular-nums`}>
						—
					</TableCell>
					<TableCell className={`${planCellClass} text-right tabular-nums`}>
						—
					</TableCell>
				</>
			) : null}
		</>
	);
}
