import {
	DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY,
	type Forma2Position,
	normalizeDefaultConstructionForma2State,
	normalizeForma2MaterialRuleName,
} from "@/flows/default-construction/lib/forma2-analytics";
import { prisma } from "@/lib/utils/db";

function analyticsRoot(value: unknown) {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function materialPositionOptions(positions: Forma2Position[]) {
	return positions
		.filter(
			(position) =>
				position.kind === "material" ||
				(position.kind === "work" && !position.parentId),
		)
		.map((position) => ({
			id: position.id,
			code: position.code,
			name: position.name,
			categoryName: position.categoryName,
			kind: position.kind,
			parentId: position.parentId,
			unit: position.unit,
		}));
}

export async function readStoredDefaultConstructionForma2MaterialAssignments(
	siteId: string,
	sources?: Array<{
		id: string;
		name: string | null;
		invoiceNr: string | null;
	}>,
) {
	const row = await prisma.analytics.findUnique({
		where: { siteId },
		select: { currentWeekProgress: true },
	});
	const state = normalizeDefaultConstructionForma2State(
		analyticsRoot(row?.currentWeekProgress)[
			DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY
		],
	);
	if (!state.document) {
		return {
			enabled: false,
			positionOptions: [],
			assignments: [],
			materialRules: [],
		};
	}
	const sourceIdSet = new Set(sources?.map((source) => source.id) ?? []);
	const filterBySource = Array.isArray(sources);
	const existingMaterialSourceIds = new Set(
		state.allocations
			.filter((allocation) => allocation.sourceType === "material")
			.map((allocation) => allocation.sourceId),
	);
	const validPositionIds = new Set(
		state.document.positions.map((position) => position.id),
	);
	const rulesByName = new Map(
		state.materialRules
			.filter((rule) => validPositionIds.has(rule.positionId))
			.map((rule) => [rule.normalizedName, rule]),
	);
	const derivedAssignments = (sources ?? []).flatMap((source) => {
		if (existingMaterialSourceIds.has(source.id)) return [];
		const label = source.name?.trim() || `Rēķins ${source.invoiceNr ?? ""}`;
		const rule = rulesByName.get(normalizeForma2MaterialRuleName(label));
		if (!rule) return [];
		return [
			{
				sourceId: source.id,
				positionId: rule.positionId,
				splitPositionIds: undefined,
				hasRemainder: false,
				method: "rule" as const,
				confidence: 1,
			},
		];
	});
	return {
		enabled: true,
		positionOptions: materialPositionOptions(state.document.positions),
		assignments: [
			...state.allocations
				.filter(
					(allocation) =>
						allocation.sourceType === "material" &&
						(!filterBySource || sourceIdSet.has(allocation.sourceId)),
				)
				.map((allocation) => ({
					sourceId: allocation.sourceId,
					positionId: allocation.positionId,
					splitPositionIds: allocation.split?.parts.map(
						(part) => part.positionId,
					),
					hasRemainder: Boolean(
						allocation.split &&
							allocation.split.parts.reduce(
								(sum, part) => sum + part.value,
								0,
							) <
								(allocation.split.basisTotal ?? Infinity) - 1e-8,
					),
					method: allocation.method,
					confidence: allocation.confidence,
				})),
			...derivedAssignments,
		],
		materialRules: state.materialRules.map((rule) => ({
			id: rule.id,
			displayName: rule.displayName,
			positionId: rule.positionId,
			createdAt: rule.createdAt,
		})),
	};
}
