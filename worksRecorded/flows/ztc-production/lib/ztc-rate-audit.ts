import type { ZtcProjectTaskRates } from "@/flows/ztc-production/backend/actions";

const RATE_CATEGORIES = [
	"works",
	"additionalDetails",
	"additionalWorks",
] as const;

type RateCategory = (typeof RATE_CATEGORIES)[number];
type RateEntry = ZtcProjectTaskRates[RateCategory][number];

export type ZtcRateAuditChange = {
	action: "added" | "removed" | "updated";
	entity: "project" | "rate";
	projectName: string;
	category?: RateCategory;
	task?: string;
	before?: unknown;
	after?: unknown;
};

function identity(value: unknown) {
	return String(value ?? "")
		.trim()
		.toLocaleLowerCase("lv")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

function comparableRate(rate: RateEntry) {
	return {
		task: rate.task,
		rate: rate.rate,
		unit: rate.unit,
		laborNorm: rate.laborNorm ?? null,
		relatesToElement: rate.relatesToElement === true,
	};
}

function comparableProject(project: ZtcProjectTaskRates) {
	return {
		manual: project.manual === true,
		excludedTasks: project.excludedTasks ?? null,
	};
}

function same(left: unknown, right: unknown) {
	return JSON.stringify(left) === JSON.stringify(right);
}

export function buildZtcRateAuditChanges(
	beforeRates: ZtcProjectTaskRates[],
	afterRates: ZtcProjectTaskRates[],
) {
	const changes: ZtcRateAuditChange[] = [];
	const beforeProjects = new Map(
		beforeRates.map((project) => [identity(project.projectName), project]),
	);
	const afterProjects = new Map(
		afterRates.map((project) => [identity(project.projectName), project]),
	);
	const projectKeys = new Set([
		...beforeProjects.keys(),
		...afterProjects.keys(),
	]);

	for (const projectKey of projectKeys) {
		const beforeProject = beforeProjects.get(projectKey);
		const afterProject = afterProjects.get(projectKey);
		const projectName =
			afterProject?.projectName ?? beforeProject?.projectName ?? "";

		if (!beforeProject || !afterProject) {
			changes.push({
				action: beforeProject ? "removed" : "added",
				entity: "project",
				projectName,
				...(beforeProject ? { before: comparableProject(beforeProject) } : {}),
				...(afterProject ? { after: comparableProject(afterProject) } : {}),
			});
		} else {
			const before = comparableProject(beforeProject);
			const after = comparableProject(afterProject);
			if (!same(before, after)) {
				changes.push({
					action: "updated",
					entity: "project",
					projectName,
					before,
					after,
				});
			}
		}

		for (const category of RATE_CATEGORIES) {
			const beforeEntries = new Map(
				(beforeProject?.[category] ?? []).map((entry) => [
					identity(entry.task),
					entry,
				]),
			);
			const afterEntries = new Map(
				(afterProject?.[category] ?? []).map((entry) => [
					identity(entry.task),
					entry,
				]),
			);
			const taskKeys = new Set([
				...beforeEntries.keys(),
				...afterEntries.keys(),
			]);

			for (const taskKey of taskKeys) {
				const beforeEntry = beforeEntries.get(taskKey);
				const afterEntry = afterEntries.get(taskKey);
				const task = afterEntry?.task ?? beforeEntry?.task ?? "";

				if (!beforeEntry || !afterEntry) {
					changes.push({
						action: beforeEntry ? "removed" : "added",
						entity: "rate",
						projectName,
						category,
						task,
						...(beforeEntry ? { before: comparableRate(beforeEntry) } : {}),
						...(afterEntry ? { after: comparableRate(afterEntry) } : {}),
					});
					continue;
				}

				const before = comparableRate(beforeEntry);
				const after = comparableRate(afterEntry);
				if (!same(before, after)) {
					changes.push({
						action: "updated",
						entity: "rate",
						projectName,
						category,
						task,
						before,
						after,
					});
				}
			}
		}
	}

	return changes;
}
