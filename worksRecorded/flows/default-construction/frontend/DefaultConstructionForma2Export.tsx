"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	calculateForma2MoneyTotals,
	type Forma2ResultRow,
} from "@/flows/default-construction/lib/forma2-analytics";
import { getForma2AnalyticsCopy } from "@/flows/default-construction/lib/forma2-analytics-copy";

type DocumentMetadata = {
	fileName: string;
	sheetName: string;
} | null;

function safeFileNamePart(value: string) {
	return (
		value
			.trim()
			.replace(/[<>:"/\\|?*]+/g, "-")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "") || "Site"
	);
}

export function DefaultConstructionForma2Export({
	siteName,
	document,
	rows,
	organizationLanguage,
}: {
	siteName: string;
	document: DocumentMetadata;
	rows: Forma2ResultRow[];
	organizationLanguage?: string | null;
}) {
	const t = getForma2AnalyticsCopy(organizationLanguage);
	const [exporting, setExporting] = useState(false);

	const exportToExcel = async () => {
		if (!rows.length || exporting) return;
		setExporting(true);
		try {
			const XLSX = await import("xlsx");
			const totals = calculateForma2MoneyTotals(rows);
			const assignedRecords = rows
				.filter((row) => !row.parentId)
				.reduce((sum, row) => sum + row.assignedRecords, 0);
			const typeLabel = {
				work: t.work,
				material: t.material,
				mechanism: t.mechanism,
			};
			const headers = [
				t.category,
				t.codeAndName,
				t.type,
				t.unit,
				t.contractQuantity,
				t.plannedWork,
				t.plannedMaterials,
				t.plannedMechanisms,
				t.plannedTotal,
				t.actualWork,
				t.actualMaterials,
				t.actualMechanisms,
				t.actualTotal,
				t.remaining,
				t.recordsAssigned,
			];
			const positionRows = rows.map((row) => [
				[row.categoryCode, row.categoryName].filter(Boolean).join(" "),
				`${row.parentId ? "  - " : ""}${row.code ? `${row.code} ` : ""}${row.name}`,
				typeLabel[row.kind],
				row.unit,
				row.plannedQuantity,
				row.plannedWorkCost,
				row.plannedMaterialCost,
				row.plannedMechanismCost,
				row.plannedTotalCost,
				row.actualWorkCost,
				row.actualMaterialCost,
				row.actualMechanismCost,
				row.actualTotalCost,
				row.variance,
				row.assignedRecords,
			]);
			const totalRow = [
				"",
				t.total,
				"",
				"",
				null,
				totals.plannedWorkCost,
				totals.plannedMaterialCost,
				totals.plannedMechanismCost,
				totals.plannedTotalCost,
				totals.actualWorkCost,
				totals.actualMaterialCost,
				totals.actualMechanismCost,
				totals.actualTotalCost,
				totals.variance,
				assignedRecords,
			];
			const documentLabel = document
				? `${document.fileName} - ${document.sheetName}`
				: "Forma 2";
			const worksheet = XLSX.utils.aoa_to_sheet([
				[`${t.results} - ${siteName}`],
				[documentLabel],
				[],
				headers,
				...positionRows,
				totalRow,
			]);
			const headerRowIndex = 3;
			const firstDataRowIndex = headerRowIndex + 1;
			const totalRowIndex = firstDataRowIndex + positionRows.length;
			worksheet["!merges"] = [
				{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
				{ s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
			];
			worksheet["!autofilter"] = {
				ref: `A${headerRowIndex + 1}:O${totalRowIndex}`,
			};
			worksheet["!cols"] = [
				{ wch: 28 },
				{ wch: 64 },
				{ wch: 14 },
				{ wch: 12 },
				{ wch: 18 },
				{ wch: 18 },
				{ wch: 20 },
				{ wch: 18 },
				{ wch: 18 },
				{ wch: 20 },
				{ wch: 18 },
				{ wch: 18 },
				{ wch: 18 },
				{ wch: 18 },
				{ wch: 18 },
			];
			for (
				let rowIndex = firstDataRowIndex;
				rowIndex <= totalRowIndex;
				rowIndex += 1
			) {
				const quantityCell =
					worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: 4 })];
				if (quantityCell) quantityCell.z = "0.00";
				for (let columnIndex = 5; columnIndex <= 13; columnIndex += 1) {
					const cell =
						worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
					if (cell) cell.z = "€ #,##0.00";
				}
			}
			const workbook = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(workbook, worksheet, "Forma 2");
			const datePart = new Date().toISOString().slice(0, 10);
			XLSX.writeFile(
				workbook,
				`Forma-2-${safeFileNamePart(siteName)}-${datePart}.xlsx`,
			);
		} catch {
			toast.error(t.exportError);
		} finally {
			setExporting(false);
		}
	};

	return (
		<Button
			type="button"
			variant="outline"
			onClick={exportToExcel}
			disabled={!rows.length || exporting}
			className="shrink-0"
		>
			{exporting ? (
				<Loader2 className="size-4 animate-spin" />
			) : (
				<Download className="size-4" />
			)}
			{exporting ? t.exportingExcel : t.exportExcel}
		</Button>
	);
}
