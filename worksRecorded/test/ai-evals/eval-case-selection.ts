export type EvalCaseTier = "smoke" | "regression" | "extended";
export type EvalCasePriority = "critical" | "standard" | "extended";

export type SelectableEvalCase = {
	id: string;
	tags?: string[];
	tier?: EvalCaseTier;
	priority?: EvalCasePriority;
};

type EvalSelectionFilters = {
	caseIds: string[];
	tags: string[];
	tiers: EvalCaseTier[];
	priorities: EvalCasePriority[];
};

type EvalSelectionOptions<TCase extends SelectableEvalCase> = {
	cases: TCase[];
	argv?: string[];
	getInteractionIds?: (evalCase: TCase) => string[];
};

type EvalSelection<TCase extends SelectableEvalCase> = {
	filters: EvalSelectionFilters;
	selectedCases: TCase[];
	selectedCaseIds: string[];
	selectedInteractionIds: string[];
	totalCases: number;
	totalInteractions: number;
	selectedInteractions: number;
	tagCounts: Record<string, number>;
	tierCounts: Record<EvalCaseTier, number>;
	priorityCounts: Record<EvalCasePriority, number>;
};

const EVAL_CASE_TIERS: EvalCaseTier[] = ["smoke", "regression", "extended"];
const EVAL_CASE_PRIORITIES: EvalCasePriority[] = [
	"critical",
	"standard",
	"extended",
];

function splitCsv(value: string) {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function getArgValues(argv: string[], name: string) {
	const values: string[] = [];
	for (let index = 0; index < argv.length; index += 1) {
		const item = argv[index];
		if (item === name) {
			const next = argv[index + 1];
			if (!next || next.startsWith("--")) {
				throw new Error(`${name} requires a value.`);
			}
			values.push(next);
			index += 1;
		} else if (item.startsWith(`${name}=`)) {
			values.push(item.slice(name.length + 1));
		}
	}
	return values.flatMap(splitCsv);
}

function parseTiers(rawTiers: string[]) {
	return rawTiers.map((tier) => {
		if (EVAL_CASE_TIERS.includes(tier as EvalCaseTier)) {
			return tier as EvalCaseTier;
		}
		throw new Error(
			`Unknown eval tier "${tier}". Use one of: ${EVAL_CASE_TIERS.join(", ")}.`,
		);
	});
}

function parsePriorities(rawPriorities: string[]) {
	return rawPriorities.map((priority) => {
		if (EVAL_CASE_PRIORITIES.includes(priority as EvalCasePriority)) {
			return priority as EvalCasePriority;
		}
		throw new Error(
			`Unknown eval priority "${priority}". Use one of: ${EVAL_CASE_PRIORITIES.join(", ")}.`,
		);
	});
}

function countDuplicateValues(values: string[]) {
	const seen = new Set<string>();
	const duplicates = new Set<string>();
	for (const value of values) {
		if (seen.has(value)) duplicates.add(value);
		seen.add(value);
	}
	return [...duplicates].sort();
}

function getCaseInteractionIds<TCase extends SelectableEvalCase>(
	evalCase: TCase,
	getInteractionIds?: (evalCase: TCase) => string[],
) {
	return getInteractionIds ? getInteractionIds(evalCase) : [evalCase.id];
}

function collectCounts<TCase extends SelectableEvalCase>(cases: TCase[]) {
	const tagCounts: Record<string, number> = {};
	const tierCounts: Record<EvalCaseTier, number> = {
		smoke: 0,
		regression: 0,
		extended: 0,
	};
	const priorityCounts: Record<EvalCasePriority, number> = {
		critical: 0,
		standard: 0,
		extended: 0,
	};

	for (const evalCase of cases) {
		for (const tag of evalCase.tags ?? []) {
			tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
		}
		tierCounts[evalCase.tier ?? "regression"] += 1;
		priorityCounts[evalCase.priority ?? "standard"] += 1;
	}

	return { tagCounts, tierCounts, priorityCounts };
}

export function selectEvalCases<TCase extends SelectableEvalCase>(
	options: EvalSelectionOptions<TCase>,
): EvalSelection<TCase> {
	const argv = options.argv ?? process.argv.slice(2);
	const filters: EvalSelectionFilters = {
		caseIds: getArgValues(argv, "--case"),
		tags: getArgValues(argv, "--tag"),
		tiers: parseTiers(getArgValues(argv, "--tier")),
		priorities: parsePriorities([
			...getArgValues(argv, "--priority"),
			...(argv.includes("--critical") ? ["critical"] : []),
		]),
	};
	const allInteractionIds = options.cases.flatMap((evalCase) =>
		getCaseInteractionIds(evalCase, options.getInteractionIds),
	);
	const duplicateCaseIds = countDuplicateValues(
		options.cases.map((evalCase) => evalCase.id),
	);
	const duplicateInteractionIds = countDuplicateValues(allInteractionIds);

	if (duplicateCaseIds.length > 0) {
		throw new Error(
			`Duplicate eval case id(s): ${duplicateCaseIds.join(", ")}.`,
		);
	}
	if (duplicateInteractionIds.length > 0) {
		throw new Error(
			`Duplicate eval interaction id(s): ${duplicateInteractionIds.join(", ")}.`,
		);
	}

	const selectedCases = options.cases.filter((evalCase) => {
		const interactionIds = getCaseInteractionIds(
			evalCase,
			options.getInteractionIds,
		);
		const caseMatches =
			filters.caseIds.length === 0 ||
			filters.caseIds.some(
				(caseId) => evalCase.id === caseId || interactionIds.includes(caseId),
			);
		const tagMatches =
			filters.tags.length === 0 ||
			filters.tags.some((tag) => (evalCase.tags ?? []).includes(tag));
		const tierMatches =
			filters.tiers.length === 0 ||
			filters.tiers.includes(evalCase.tier ?? "regression");
		const priorityMatches =
			filters.priorities.length === 0 ||
			filters.priorities.includes(evalCase.priority ?? "standard");

		return caseMatches && tagMatches && tierMatches && priorityMatches;
	});

	if (selectedCases.length === 0) {
		throw new Error(
			`No eval cases matched filters: ${formatEvalSelectionFilters(filters)}.`,
		);
	}

	const selectedInteractionIds = selectedCases.flatMap((evalCase) =>
		getCaseInteractionIds(evalCase, options.getInteractionIds),
	);
	const { tagCounts, tierCounts, priorityCounts } =
		collectCounts(selectedCases);

	return {
		filters,
		selectedCases,
		selectedCaseIds: selectedCases.map((evalCase) => evalCase.id),
		selectedInteractionIds,
		totalCases: options.cases.length,
		totalInteractions: allInteractionIds.length,
		selectedInteractions: selectedInteractionIds.length,
		tagCounts,
		tierCounts,
		priorityCounts,
	};
}

export function formatEvalSelectionFilters(filters: EvalSelectionFilters) {
	const parts = [
		filters.caseIds.length ? `case=${filters.caseIds.join(",")}` : null,
		filters.tags.length ? `tag=${filters.tags.join(",")}` : null,
		filters.tiers.length ? `tier=${filters.tiers.join(",")}` : null,
		filters.priorities.length
			? `priority=${filters.priorities.join(",")}`
			: null,
	].filter((item): item is string => Boolean(item));
	return parts.length > 0 ? parts.join(" ") : "none";
}

export function formatEvalSelectionSummary<TCase extends SelectableEvalCase>(
	selection: EvalSelection<TCase>,
) {
	return [
		`Filters: ${formatEvalSelectionFilters(selection.filters)}`,
		`Selected ${selection.selectedCases.length}/${selection.totalCases} cases and ${selection.selectedInteractions}/${selection.totalInteractions} interactions.`,
		`Selected case IDs: ${selection.selectedCaseIds.join(", ")}`,
		`Selected interaction IDs: ${selection.selectedInteractionIds.join(", ")}`,
		`Selected tiers: ${EVAL_CASE_TIERS.map((tier) => `${tier}=${selection.tierCounts[tier]}`).join(", ")}`,
		`Selected priorities: ${EVAL_CASE_PRIORITIES.map((priority) => `${priority}=${selection.priorityCounts[priority]}`).join(", ")}`,
		`Selected tags: ${
			Object.entries(selection.tagCounts)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([tag, count]) => `${tag}=${count}`)
				.join(", ") || "none"
		}`,
	];
}
