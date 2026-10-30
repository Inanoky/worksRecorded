import type { ConstructionDiaryListRow } from "@/flows/default-construction/backend/diary-list-record";
import { getFimaBisStatus } from "./bis-status";
import { type FimaDiaryFilters, readFimaDiaryFilters } from "./diary-filters";
import { parseFimaDiaryNumber } from "./diary-number";
import type { FimaProjectDiary } from "./project-diary";

export type FimaDiaryWorkspace = {
	siteId: string;
	revision: string;
	configVersion: string;
	versions: Record<string, string>;
	config: FimaProjectDiary["config"];
	rows: ConstructionDiaryListRow[];
	bisEnabled: boolean;
	organizationLanguage: string | null;
};
export type FimaDiaryDelta = {
	siteId: string;
	revision: string;
	configVersion: string;
	versions: Record<string, string>;
	removed: string[];
	rows: ConstructionDiaryListRow[];
	config?: FimaProjectDiary["config"];
};
export type FimaClientDiaryFilters = FimaDiaryFilters & {
	page?: number;
	dateFrom?: string | null;
	dateTo?: string | null;
	workFilter?: string;
	floorFilter?: string;
	keyword?: string;
};
export function hydrateFimaDiaryRows(rows: ConstructionDiaryListRow[]) {
	return rows.map((row) => {
		const dates = [
			"Date",
			"Date_Custom_1",
			"Date_Custom_2",
			"createdAt",
		].filter(
			(key) => typeof row[key as keyof ConstructionDiaryListRow] === "string",
		);
		return dates.length
			? {
					...row,
					...Object.fromEntries(
						dates.map((key) => [
							key,
							row[key as keyof ConstructionDiaryListRow]
								? new Date(row[key as keyof ConstructionDiaryListRow] as string)
								: null,
						]),
					),
				}
			: row;
	});
}
export function fimaDiaryRowMatches(
	row: ConstructionDiaryListRow,
	input: FimaClientDiaryFilters,
	config: FimaDiaryWorkspace["config"],
) {
	const filters = readFimaDiaryFilters(input);
	const state = row.fimaCollaboration;
	if (
		filters.review &&
		(filters.review === "unassigned"
			? !!state?.status
			: state?.status !== filters.review)
	)
		return false;
	if (
		filters.bisStatus &&
		getFimaBisStatus(row.bisStatus) !== filters.bisStatus
	)
		return false;
	const presence = (filter: string | undefined, present: boolean) =>
		!filter || (filter === "present") === present;
	if (!presence(filters.bis, !!row.BISId || !!row.fimaBisRecords?.length))
		return false;
	if (
		!presence(
			filters.materials,
			!!state?.materials.length ||
				!!state?.bisMaterials?.entries.some(
					(entry) => entry.materials.length > 0,
				),
		)
	)
		return false;
	if (!presence(filters.examples, !!state?.examples?.entries.length))
		return false;
	const date = row.Date ? new Date(row.Date).toISOString().slice(0, 10) : "";
	if (input.dateFrom && (!date || date < input.dateFrom)) return false;
	if (input.dateTo && (!date || date > input.dateTo)) return false;
	if (
		input.workFilter &&
		input.workFilter !== "__ALL__" &&
		row.Works !== input.workFilter
	)
		return false;
	if (
		input.floorFilter &&
		input.floorFilter !== "__ALL__" &&
		row.Location !== input.floorFilter
	)
		return false;
	const keyword = input.keyword?.trim().toLowerCase();
	if (!keyword) return true;
	if (row.fimaNumber === parseFimaDiaryNumber(keyword)) return true;
	const settings = config.otherSettings as Record<string, unknown> | undefined;
	const values = [
		...Object.values(row).filter((value) => typeof value === "string"),
		settings?.bisCaseId,
		settings?.bisCaseNumber,
		...(row.fimaBisRecords ?? []).flatMap((link) => [link.id, link.number]),
		...(row.fimaActCoverage?.acts ?? []).flatMap((act) => [act.id, act.number]),
		row.fimaActCoverage?.caseId,
	];
	return values.some(
		(value) =>
			typeof value === "string" && value.toLowerCase().includes(keyword),
	);
}
export function selectFimaDiaryPage(
	data: FimaDiaryWorkspace,
	filters: FimaClientDiaryFilters,
	all = false,
) {
	const rows = data.rows.filter((row) =>
		fimaDiaryRowMatches(row, filters, data.config),
	);
	rows.sort(
		(a, b) =>
			(a.Date && b.Date
				? +new Date(b.Date) - +new Date(a.Date)
				: a.Date
					? 1
					: b.Date
						? -1
						: 0) ||
			+new Date(b.createdAt) - +new Date(a.createdAt) ||
			b.id.localeCompare(a.id),
	);
	const totalPages = Math.max(1, Math.ceil(rows.length / 75));
	const page = Math.max(
		1,
		Math.min(
			Number.isSafeInteger(filters.page) ? (filters.page ?? 1) : 1,
			totalPages,
		),
	);
	return {
		rows: all ? rows : rows.slice((page - 1) * 75, page * 75),
		page,
		pageSize: 75,
		totalCount: rows.length,
		totalPages,
	};
}
export function mergeFimaDiaryDelta(
	current: FimaDiaryWorkspace,
	delta: FimaDiaryDelta,
) {
	if (current.siteId !== delta.siteId)
		throw new Error("Saņemti cita projekta ieraksti.");
	const rows = new Map(current.rows.map((row) => [row.id, row]));
	const versions = { ...current.versions, ...delta.versions };
	for (const id of delta.removed) {
		rows.delete(id);
		delete versions[id];
	}
	for (const row of hydrateFimaDiaryRows(delta.rows)) rows.set(row.id, row);
	return {
		...current,
		revision: delta.revision,
		configVersion: delta.configVersion,
		versions,
		config: delta.config ?? current.config,
		rows: [...rows.values()],
	};
}
