import {
	buildZtcRecordedWorkFilterOptions,
	resolveZtcRateTaskForRow,
	type ZtcRateProject,
	ztcRowMatchesConfiguredWorkFilter,
} from "@/flows/ztc-production/lib/ztc-rate-resolver";
import {
	buildZtcScopeSummary,
	type ZtcScopeFilters,
} from "@/flows/ztc-production/lib/ztc-scope-summary";
import type { ZtcDiaryRow } from "@/flows/ztc-production/lib/ztc-site-diary-utils";

function filterValue(value: string | null | undefined) {
	return value && value !== "__ALL__" ? value.trim() : "";
}

function dateBoundary(value: string | Date | null | undefined, end = false) {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return end ? date.setHours(23, 59, 59, 999) : date.setHours(0, 0, 0, 0);
}

export function createZtcDiaryView(
	rows: ZtcDiaryRow[],
	rates: ZtcRateProject[],
) {
	const workGroups = new Map<
		string,
		{ works: string[]; workMatches: Map<string, boolean> }
	>();
	const rateKey = (row: ZtcDiaryRow) =>
		JSON.stringify([
			row.Location,
			row.Location_Custom_1,
			row.Works,
			row.Works_Custom_1,
			row.Units,
			row.Comments_Custom_2,
		]);
	const entries = rows.map((row) => {
		const key = rateKey(row);
		let group = workGroups.get(key);
		if (!group) {
			group = {
				works: buildZtcRecordedWorkFilterOptions({
					rows: [row],
					defaultRates: rates,
				}),
				workMatches: new Map<string, boolean>(),
			};
			workGroups.set(key, group);
		}
		return {
			row,
			date: new Date(row.Date).getTime(),
			project: String(row.Location ?? "").trim(),
			element: String(row.Location_Custom_1 ?? "").trim(),
			worker: String(row.createdBy ?? "").trim(),
			text: [
				row.Works,
				row.Works_Custom_1,
				row.Works_Custom_2,
				row.Location,
				row.Location_Custom_1,
				row.Location_Custom_2,
				row.createdBy,
				row.Comments,
				row.Comments_Custom_1,
				row.Comments_Custom_2,
				row.originalUserComment,
				row.Units,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase(),
			works: group.works,
			workMatches: group.workMatches,
		};
	});
	const resolvedRates = new Map<
		string,
		ReturnType<typeof resolveZtcRateTaskForRow>
	>();

	return {
		select(filters: ZtcScopeFilters) {
			const project = filterValue(filters.projectName);
			const element = filterValue(filters.elementName);
			const worker = filterValue(filters.workerName);
			const work = filterValue(filters.workName);
			const keyword = String(filters.keyword ?? "")
				.trim()
				.toLowerCase();
			const from = dateBoundary(filters.dateFrom);
			const to = dateBoundary(filters.dateTo, true);
			const projects = new Set<string>();
			const elements = new Set<string>();
			const workers = new Set<string>();
			const works = new Set<string>();
			const matchingRows: ZtcDiaryRow[] = [];
			for (const entry of entries) {
				if (!Number.isFinite(entry.date)) continue;
				if (from != null && entry.date < from) continue;
				if (to != null && entry.date > to) continue;
				if (keyword && !entry.text.includes(keyword)) continue;
				const matchesProject = !project || entry.project === project;
				const matchesElement = !element || entry.element === element;
				const matchesWorker = !worker || entry.worker === worker;
				if (work && !entry.workMatches.has(work)) {
					entry.workMatches.set(
						work,
						ztcRowMatchesConfiguredWorkFilter(entry.row, work, rates),
					);
				}
				const matchesWork = !work || entry.workMatches.get(work);
				if (matchesElement && matchesWorker && matchesWork && entry.project)
					projects.add(entry.project);
				if (matchesProject && matchesWorker && matchesWork && entry.element)
					elements.add(entry.element);
				if (matchesProject && matchesElement && matchesWork && entry.worker)
					workers.add(entry.worker);
				if (matchesProject && matchesElement && matchesWorker) {
					for (const option of entry.works) works.add(option);
					if (matchesWork) matchingRows.push(entry.row);
				}
			}
			const sorted = (values: Set<string>) =>
				Array.from(values).sort((a, b) => a.localeCompare(b, "lv"));
			return {
				rows: matchingRows,
				options: {
					projects: sorted(projects),
					elements: sorted(elements),
					workers: sorted(workers),
					works: sorted(works),
				},
			};
		},
		summary(filters: ZtcScopeFilters) {
			const projectName = filterValue(filters.projectName);
			const elementName = filterValue(filters.elementName);
			const workerName = filterValue(filters.workerName);
			if (!projectName && !elementName && !workerName) return null;
			return buildZtcScopeSummary(
				rows,
				rates,
				{
					projectName,
					elementName,
					workerName,
					workName: workerName ? filterValue(filters.workName) : null,
					dateFrom: workerName ? filters.dateFrom : null,
					dateTo: workerName ? filters.dateTo : null,
					keyword: workerName ? filters.keyword : null,
				},
				(row) => {
					const key = rateKey(row);
					if (!resolvedRates.has(key))
						resolvedRates.set(key, resolveZtcRateTaskForRow(row, rates));
					return resolvedRates.get(key) ?? null;
				},
			);
		},
	};
}
