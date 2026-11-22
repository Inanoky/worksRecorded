import {
	buildForma2ActCoverage,
	type Forma2ActAssignment,
	type Forma2ActWorkDetails,
	type Forma2CoverageAct,
} from "./forma2-act-coverage";
import {
	buildForma2AnalyticsView,
	type Forma2Document,
	type Forma2MappingRow,
	type Forma2ResultRow,
} from "./forma2-analytics";
import type { Forma2ClientCosts } from "./forma2-client-costs";
import {
	getForma2QuantityExclusion,
	getForma2ReportedQuantity,
} from "./forma2-quantities";

export type Forma2ResultsInput = {
	siteName: string;
	document:
		| (Pick<Forma2Document, "id" | "fileName" | "sheetName" | "importedAt"> & {
				positionCount: number;
		  })
		| null;
	clientCosts: Forma2ClientCosts;
	isDemo?: boolean;
	demoCosts?: Record<string, unknown>;
	quantitySource?: "drawing";
	actCoverage?: {
		caseId: string;
		documentId: string;
		acts: Forma2CoverageAct[];
		bisWorkIdsByRecord: [string, string[]][];
		workDetails: [string, Forma2ActWorkDetails][];
		assignments: Forma2ActAssignment[];
	};
};

export type Forma2DiaryDetails = Record<
	string,
	{
		label: string | null;
		secondaryLabel: string | null;
		plannedQuantity: number | null;
		description: string | null;
		photos: string[];
	}
>;

export type FimaForma2Workspace = {
	siteId: string;
	organizationLanguage: string | null;
	input: Forma2ResultsInput;
	diary: Forma2DiaryDetails;
};

function demoAmount(value: unknown) {
	const amount = Number(value);
	return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function applyForma2DemoCosts(
	rows: Forma2ResultRow[],
	costs: Record<string, unknown>,
) {
	return rows.map((row) => {
		if (!Object.hasOwn(costs, row.id)) return row;
		const entry = costs[row.id] as Record<
			string,
			Record<string, unknown>
		> | null;
		const plannedWorkCost = demoAmount(entry?.contract?.work);
		const plannedMaterialCost = demoAmount(entry?.contract?.material);
		const plannedMechanismCost = demoAmount(entry?.contract?.mechanism);
		const plannedTotalCost = Number(
			(plannedWorkCost + plannedMaterialCost + plannedMechanismCost).toFixed(2),
		);
		const actualWorkCost = demoAmount(entry?.actual?.work);
		const actualMaterialCost = demoAmount(entry?.actual?.material);
		const actualMechanismCost = demoAmount(entry?.actual?.mechanism);
		const actualTotalCost = Number(
			(actualWorkCost + actualMaterialCost + actualMechanismCost).toFixed(2),
		);
		const directPlannedCosts = {
			plannedWorkCost,
			plannedMaterialCost,
			plannedMechanismCost,
			plannedTotalCost,
		};
		return {
			...row,
			...directPlannedCosts,
			directPlannedCosts,
			actualWorkCost,
			actualMaterialCost,
			actualMechanismCost,
			actualTotalCost,
			variance: Number((plannedTotalCost - actualTotalCost).toFixed(2)),
		};
	});
}

export function calculateForma2Results(input: Forma2ResultsInput) {
	const view = buildForma2AnalyticsView({
		...input.clientCosts,
		includeSuggestions: false,
	});
	const coverage = input.actCoverage;
	return {
		mappingRows: view.mappingRows,
		data: {
			siteName: input.siteName,
			document: input.document,
			resultRows: input.demoCosts
				? applyForma2DemoCosts(view.resultRows, input.demoCosts)
				: view.resultRows,
			clientCosts: input.clientCosts,
			...(input.isDemo ? { isDemo: true } : {}),
			...(input.quantitySource ? { quantitySource: input.quantitySource } : {}),
			...(coverage
				? {
						actCoverage: buildForma2ActCoverage({
							...coverage,
							bisWorkIdsByRecord: new Map(coverage.bisWorkIdsByRecord),
							workDetails: new Map(coverage.workDetails),
							positions: input.clientCosts.positions,
							works: view.mappingRows,
						}),
					}
				: {}),
		},
	};
}

export function getForma2QuantityDetails(
	position: Forma2ResultRow,
	works: Forma2MappingRow[],
	diary: Forma2DiaryDetails,
	usesDrawingQuantities: boolean,
) {
	const records = works
		.filter(
			(row) => row.type === "work" && row.assignedPositionId === position.id,
		)
		.map((row) => {
			const detail = diary[row.id];
			const quantity = getForma2ReportedQuantity(row);
			return {
				id: row.id,
				label: detail?.label ?? row.label,
				secondaryLabel: detail?.secondaryLabel ?? row.secondaryLabel,
				plannedQuantity: detail?.plannedQuantity ?? null,
				description: detail?.description || row.secondaryLabel || null,
				photos: detail?.photos ?? [],
				date: row.date,
				unit: row.unit,
				quantity: row.quantity,
				reportedQuantity: quantity,
				exclusion: getForma2QuantityExclusion(
					quantity,
					row.unit,
					position.unit,
				),
			};
		})
		.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
	return {
		position: {
			id: position.id,
			code: position.code,
			name: position.name,
			unit: position.unit,
			plannedQuantity: position.plannedQuantity,
		},
		calculatedTotal: position.actualQuantity,
		usesDrawingQuantities,
		includedRecords: records.filter((row) => !row.exclusion).length,
		excludedRecords: position.excludedQuantityRecords,
		records,
	};
}
