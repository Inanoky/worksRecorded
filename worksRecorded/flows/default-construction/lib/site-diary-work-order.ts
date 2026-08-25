const WORK_PREFIX = /^\s*(\d+(?:\.\d+)+)(?:\s|$)/u;

export const DEFAULT_CONSTRUCTION_SYSTEM_WORKS = [
	"Uzkopšanas darbi",
	"Elektroinstalācijas darbi",
	"Santehnikas darbi",
	"Apkures sistēmas un ventilācijas darbi",
	"Materiālu piegāde",
	"Kavēšanās",
	"Papildu darbi",
	"Piezīmes",
] as const;

const DEFAULT_CONSTRUCTION_SYSTEM_WORK_KEYS = new Set(
	DEFAULT_CONSTRUCTION_SYSTEM_WORKS.map(normalizeSiteDiaryWorkKey),
);

export type GroupedSiteDiaryWorks<T> = {
	customWorks: T[];
	defaultWorks: T[];
};

export function normalizeSiteDiaryWorkKey(value: unknown) {
	return String(value ?? "")
		.trim()
		.toLocaleLowerCase("lv");
}

export function isDefaultConstructionSystemWork(value: unknown) {
	return DEFAULT_CONSTRUCTION_SYSTEM_WORK_KEYS.has(
		normalizeSiteDiaryWorkKey(value),
	);
}

function readWorkPrefix(value: string) {
	const match = value.match(WORK_PREFIX);
	return match ? match[1].split(".").map(Number) : null;
}

export function compareSiteDiaryWorkPrefixes(left: string, right: string) {
	const leftPrefix = readWorkPrefix(left);
	const rightPrefix = readWorkPrefix(right);

	if (!leftPrefix && !rightPrefix) return 0;
	if (!leftPrefix) return 1;
	if (!rightPrefix) return -1;

	const segmentCount = Math.max(leftPrefix.length, rightPrefix.length);
	for (let index = 0; index < segmentCount; index += 1) {
		if (leftPrefix[index] == null) return -1;
		if (rightPrefix[index] == null) return 1;
		if (leftPrefix[index] !== rightPrefix[index]) {
			return leftPrefix[index] - rightPrefix[index];
		}
	}
	return 0;
}

export function compareSiteDiaryWorks(left: string, right: string) {
	return (
		compareSiteDiaryWorkPrefixes(left, right) ||
		left.localeCompare(right, "lv", { numeric: true, sensitivity: "base" })
	);
}

export function compareGroupedDefaultConstructionSiteDiaryWorks(
	left: string,
	right: string,
) {
	const leftIsDefault = isDefaultConstructionSystemWork(left);
	const rightIsDefault = isDefaultConstructionSystemWork(right);

	if (leftIsDefault !== rightIsDefault) return leftIsDefault ? 1 : -1;

	return compareSiteDiaryWorks(left, right);
}

export function groupDefaultConstructionSiteDiaryWorks<T>(
	works: T[],
	readWork: (work: T) => string,
): GroupedSiteDiaryWorks<T> {
	const sorted = [...works].sort((left, right) =>
		compareGroupedDefaultConstructionSiteDiaryWorks(
			readWork(left),
			readWork(right),
		),
	);

	return {
		customWorks: sorted.filter(
			(work) => !isDefaultConstructionSystemWork(readWork(work)),
		),
		defaultWorks: sorted.filter((work) =>
			isDefaultConstructionSystemWork(readWork(work)),
		),
	};
}

export function sortDefaultConstructionSiteDiaryWorks(works: string[]) {
	return [...works].sort(compareGroupedDefaultConstructionSiteDiaryWorks);
}
