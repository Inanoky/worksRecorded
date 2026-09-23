import type { BrowserDiaryEntry } from "./schema";

const DIACRITIC_PATTERN = /[\u0300-\u036f]/g;

export type SiteWorkConfiguration = {
	options: string[];
	rates: Array<{
		work: string;
		unit?: string | null;
		laborNormHoursPerUnit?: number | null;
	}>;
};

export function normalizeForMatch(value: string) {
	return value
		.normalize("NFD")
		.replace(DIACRITIC_PATTERN, "")
		.toLocaleLowerCase("lv")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function numberTokens(value: string): string[] {
	return normalizeForMatch(value).match(/\d+[a-z]?/g) ?? [];
}

function wordTokens(value: string) {
	return new Set(
		normalizeForMatch(value)
			.split(" ")
			.filter((token) => token.length >= 3 && !/^\d/.test(token)),
	);
}

function tokenScore(left: string, right: string) {
	const leftTokens = wordTokens(left);
	const rightTokens = wordTokens(right);
	if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
	let intersection = 0;
	for (const token of leftTokens) {
		if (rightTokens.has(token)) intersection += 1;
	}
	return intersection / new Set([...leftTokens, ...rightTokens]).size;
}

export function canonicalProjectName(value: string) {
	const normalized = normalizeForMatch(value);
	if (normalized.includes("preses nams")) return "balasta dambis 2";
	return normalized;
}

export function chooseExistingProject<
	T extends { name: string; description: string },
>(requestedName: string, projects: T[]) {
	const requested = canonicalProjectName(requestedName);
	const exact = projects.find(
		(project) =>
			canonicalProjectName(project.name) === requested ||
			canonicalProjectName(project.description) === requested,
	);
	if (exact) return exact;

	const requestedNumbers = numberTokens(requestedName);
	if (requestedNumbers.length === 0) return null;

	const candidates = projects
		.map((project) => {
			const candidateNumbers = numberTokens(
				`${project.name} ${project.description}`,
			);
			const sameNumbers =
				requestedNumbers.length === candidateNumbers.length &&
				requestedNumbers.every((token) => candidateNumbers.includes(token));
			return {
				project,
				score: sameNumbers
					? Math.max(
							tokenScore(requestedName, project.name),
							tokenScore(requestedName, project.description),
						)
					: 0,
			};
		})
		.filter((candidate) => candidate.score >= 0.6)
		.sort((left, right) => right.score - left.score);

	return candidates.length === 1 ? candidates[0].project : null;
}

export function extractThicknessMm(value: string) {
	const normalized = normalizeForMatch(value);
	const matches = [...normalized.matchAll(/(?:^|\s)(\d{2,4})\s*mm(?:\s|$)/g)];
	if (matches.length === 0) return null;
	const values = matches
		.map((match) => Number(match[1]))
		.filter((number) => Number.isFinite(number));
	return values.length > 0 ? Math.max(...values) : null;
}

function categoryKeywords(category: BrowserDiaryEntry["workCategory"]) {
	if (category === "estrich") {
		return ["estrich", "klona", "cementa", "betona grida", "sausais betons"];
	}
	if (category === "film") return ["pleve", "hidroizol", "tvaika izol"];
	if (category === "thermowhite") {
		return ["thermowhite", "putoplisterola granulas", "skanas izol", "wd100"];
	}
	if (category === "material_delivery") return ["materialu piegade"];
	return [];
}

export function chooseExistingWork(
	entry: BrowserDiaryEntry,
	configuration: SiteWorkConfiguration,
) {
	const keywords = categoryKeywords(entry.workCategory);
	const targetThickness = averageThicknessMm(entry);
	const candidates = configuration.options
		.map((option) => {
			const normalized = normalizeForMatch(option);
			const keywordScore = keywords.reduce(
				(score, keyword) => score + (normalized.includes(keyword) ? 2 : 0),
				0,
			);
			const semanticScore = tokenScore(entry.workText, option);
			const optionThickness = extractThicknessMm(option);
			const thicknessScore =
				targetThickness && optionThickness
					? Math.max(0, 2 - Math.abs(targetThickness - optionThickness) / 25)
					: 0;
			return {
				option,
				score: keywordScore + semanticScore + thicknessScore,
			};
		})
		.sort((left, right) => right.score - left.score);

	if (candidates[0] && candidates[0].score >= 1) return candidates[0].option;

	const normalizedOptions = configuration.options.map((option) => ({
		option,
		normalized: normalizeForMatch(option),
	}));
	const fallbackOrder =
		entry.workCategory === "material_delivery"
			? ["materialu piegade", "papildu darbi", "piezimes"]
			: entry.workCategory === "estrich"
				? ["betonesanas darbi", "papildu darbi", "piezimes"]
				: ["papildu darbi", "piezimes"];

	for (const fallback of fallbackOrder) {
		const match = normalizedOptions.find(({ normalized }) =>
			normalized.includes(fallback),
		);
		if (match) return match.option;
	}

	return null;
}

export function averageThicknessMm(entry: BrowserDiaryEntry) {
	if (entry.thicknessMinMm != null && entry.thicknessMaxMm != null) {
		return (entry.thicknessMinMm + entry.thicknessMaxMm) / 2;
	}
	return entry.thicknessMinMm ?? entry.thicknessMaxMm ?? null;
}

export function calculateActualArea(args: {
	entry: BrowserDiaryEntry;
	projectName: string;
	selectedWork: string | null;
}) {
	const { entry, projectName, selectedWork } = args;
	if (entry.workCategory === "film") return entry.plannedAreaM2;

	let thicknessMm = averageThicknessMm(entry);
	if (entry.workCategory === "thermowhite" && !thicknessMm) thicknessMm = 120;
	if (
		entry.workCategory === "estrich" &&
		!thicknessMm &&
		canonicalProjectName(projectName) === "balasta dambis 2"
	) {
		thicknessMm = 70;
	}

	if (entry.bagCount != null && thicknessMm && thicknessMm > 0) {
		return Number((entry.bagCount / 5 / (thicknessMm / 1_000)).toFixed(2));
	}

	const rateThickness = selectedWork ? extractThicknessMm(selectedWork) : null;
	if (
		entry.workCategory === "estrich" &&
		entry.plannedAreaM2 != null &&
		thicknessMm &&
		rateThickness &&
		thicknessMm > rateThickness
	) {
		return Number(
			((thicknessMm / rateThickness) * entry.plannedAreaM2).toFixed(2),
		);
	}

	return null;
}

export function getWorkConfiguration(siteDiaryRecordsMap: unknown) {
	const asRecord = (value: unknown): Record<string, unknown> =>
		value && typeof value === "object"
			? (value as Record<string, unknown>)
			: {};
	const map = asRecord(siteDiaryRecordsMap);
	const works = asRecord(map.Works);
	const options = Object.values(asRecord(works.DropDownOptions)).filter(
		(value): value is string => typeof value === "string",
	);
	const otherSettings = asRecord(map.otherSettings);
	const productivity = asRecord(otherSettings.defaultConstructionProductivity);
	const configuredRates = productivity.works;
	const rates = Array.isArray(configuredRates)
		? configuredRates.filter(
				(rate: unknown): rate is SiteWorkConfiguration["rates"][number] =>
					Boolean(
						rate &&
							typeof rate === "object" &&
							typeof (rate as { work?: unknown }).work === "string",
					),
			)
		: [];
	return { options, rates } satisfies SiteWorkConfiguration;
}
