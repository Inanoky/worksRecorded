import { applyZtcExcelNumberFormats } from "@/flows/ztc-production/lib/ztc-excel-export";
import {
	getZtcPayrollValues,
	getZtcProjectElementAreas,
	type ZtcDiaryRow,
} from "@/flows/ztc-production/lib/ztc-site-diary-utils";

export type ZtcElementCostRow = {
	Projekts: string;
	Elements: string;
	"Platība, m²": number | null;
	"Izmaksas, €": number;
	"Izmaksas uz m², €/m²": number | null;
};

function normalizeZtcElementExportText(value: unknown) {
	return String(value ?? "").trim();
}

function getZtcElementExportKey(value: unknown) {
	return normalizeZtcElementExportText(value)
		.toLocaleLowerCase("lv")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

function compareZtcExportRowsNewestFirst(a: ZtcDiaryRow, b: ZtcDiaryRow) {
	for (const field of ["Date", "Date_Custom_1", "createdAt"] as const) {
		const aTime = new Date(a[field] ?? "").getTime();
		const bTime = new Date(b[field] ?? "").getTime();
		const difference =
			(Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
		if (difference !== 0) return difference;
	}
	return 0;
}

function compareZtcElementNames(a: string, b: string) {
	return a.localeCompare(b, "lv", { numeric: true, sensitivity: "base" });
}

export function buildZtcElementCostRows(
	rows: ZtcDiaryRow[],
): ZtcElementCostRow[] {
	const rowsNewestFirst = [...rows].sort(compareZtcExportRowsNewestFirst);
	const projects = new Map<string, { name: string; rows: ZtcDiaryRow[] }>();
	const groups = new Map<
		string,
		{
			project: string;
			element: string;
			rows: ZtcDiaryRow[];
			cost: number;
			area: number | null;
		}
	>();

	rowsNewestFirst.forEach((row) => {
		const project = normalizeZtcElementExportText(row.Location);
		if (!project || project === "Papilddarbi") return;

		const projectKey = project.toLocaleLowerCase("lv");
		const projectGroup = projects.get(projectKey) ?? {
			name: project,
			rows: [],
		};
		projectGroup.rows.push(row);
		projects.set(projectKey, projectGroup);
	});

	projects.forEach((project) => {
		getZtcProjectElementAreas(project.rows, project.name).forEach(
			({ element, elementKey, area }) => {
				const key = `${project.name.toLocaleLowerCase("lv")}::${elementKey}`;
				groups.set(key, {
					project: project.name,
					element,
					rows: [],
					cost: 0,
					area,
				});
			},
		);
	});

	rowsNewestFirst.forEach((row) => {
		const project = normalizeZtcElementExportText(row.Location);
		const element = normalizeZtcElementExportText(row.Location_Custom_1);
		if (
			!project ||
			!element ||
			project === "Papilddarbi" ||
			element === "Papilddarbi"
		) {
			return;
		}

		const key = `${project.toLocaleLowerCase("lv")}::${getZtcElementExportKey(element)}`;
		const group = groups.get(key) ?? {
			project,
			element,
			rows: [],
			cost: 0,
			area: null,
		};
		group.rows.push(row);
		group.cost += getZtcPayrollValues(row).sum;
		groups.set(key, group);
	});

	return Array.from(groups.values())
		.map((group) => {
			const cost = Number(group.cost.toFixed(2));

			return {
				Projekts: group.project,
				Elements: group.element,
				"Platība, m²": group.area,
				"Izmaksas, €": cost,
				"Izmaksas uz m², €/m²":
					group.area != null && group.area > 0
						? Number((cost / group.area).toFixed(2))
						: null,
			};
		})
		.sort(
			(a, b) =>
				a.Projekts.localeCompare(b.Projekts, "lv", { sensitivity: "base" }) ||
				compareZtcElementNames(a.Elements, b.Elements),
		);
}

function getZtcElementExportDatePart(rows: ZtcDiaryRow[]) {
	const dates = rows
		.map((row) => new Date(row.Date))
		.filter((date) => !Number.isNaN(date.getTime()))
		.sort((a, b) => a.getTime() - b.getTime());
	if (!dates.length) return "empty";

	const dateKey = (date: Date) =>
		`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
			date.getDate(),
		).padStart(2, "0")}`;
	return `${dateKey(dates[0])}_${dateKey(dates[dates.length - 1])}`;
}

export async function exportZtcElementsToExcel({
	rows,
}: {
	rows: ZtcDiaryRow[];
}) {
	const XLSX = await import("xlsx");
	const elementRows = buildZtcElementCostRows(rows);
	const worksheet = XLSX.utils.json_to_sheet(elementRows);
	applyZtcExcelNumberFormats(XLSX, worksheet);
	worksheet["!cols"] = [
		{ wch: 30 },
		{ wch: 18 },
		{ wch: 14 },
		{ wch: 14 },
		{ wch: 24 },
	];

	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, "Pa elementiem");
	XLSX.writeFile(
		workbook,
		`Razosana-Pa-elementiem-${getZtcElementExportDatePart(rows)}.xlsx`,
	);
}
