import {
	type Forma2ActualSource,
	type Forma2Allocation,
	type Forma2Position,
	getForma2CostShares,
} from "./forma2-analytics";

export type Forma2ClientCosts = {
	positions: Forma2Position[];
	sources: Forma2ActualSource[];
	allocations: Forma2Allocation[];
};

export function getForma2ClientCostDetails(
	data: Forma2ClientCosts,
	args: {
		positionId: string;
		costType: "work" | "material" | "total";
	},
) {
	const positions = data.positions;
	const position = positions.find((item) => item.id === args.positionId);
	if (!position) throw new Error("Forma 2 position was not found");
	const includedPositionIds = new Set([
		position.id,
		...positions
			.filter((item) => item.parentId === position.id)
			.map((item) => item.id),
	]);
	const positionsById = new Map(positions.map((item) => [item.id, item]));
	const allocationsBySource = new Map(
		data.allocations.map((allocation) => [
			`${allocation.sourceType}:${allocation.sourceId}`,
			allocation,
		]),
	);
	const records = data.sources
		.flatMap((source) => {
			if (args.costType !== "total" && source.type !== args.costType) return [];
			const allocation = allocationsBySource.get(`${source.type}:${source.id}`);
			if (args.costType === "material" && allocation?.costKind === "mechanism")
				return [];
			const selectedPositionId =
				source.selectedPositionId &&
				positionsById.has(source.selectedPositionId)
					? source.selectedPositionId
					: null;
			return getForma2CostShares(source, allocation, positionsById).flatMap(
				(share) => {
					if (!includedPositionIds.has(share.positionId)) return [];
					const assignedPosition = positionsById.get(share.positionId);
					if (!assignedPosition) return [];
					return [
						{
							id: source.id,
							type: source.type,
							label: source.label,
							secondaryLabel:
								source.type === "material"
									? (source.invoiceLabel ?? "")
									: source.secondaryLabel,
							invoiceUrl: source.invoiceUrl ?? null,
							invoiceNumber: source.invoiceNumber ?? null,
							supplierName: source.supplierName ?? null,
							date: source.date,
							unit: source.unit,
							quantity: share.quantity,
							isSplit: Boolean(allocation?.split),
							...(source.id.startsWith("begin:") ? { readOnly: true } : {}),
							hours: source.hours,
							hourlyRate: source.hourlyRate ?? null,
							unitRate: source.unitRate ?? null,
							costCalculationMode: source.costCalculationMode ?? "output",
							...(source.costSource ? { costSource: source.costSource } : {}),
							actualCost: share.actualCost,
							assignmentMethod:
								selectedPositionId && !allocation?.overrideJournalPosition
									? ("manual" as const)
									: (allocation?.method ?? "manual"),
							assignmentConfidence:
								selectedPositionId && !allocation?.overrideJournalPosition
									? 1
									: (allocation?.confidence ?? null),
							assignedPosition: {
								id: assignedPosition.id,
								code: assignedPosition.code,
								name: assignedPosition.name,
							},
						},
					];
				},
			);
		})
		.sort((left, right) =>
			String(right.date ?? "").localeCompare(String(left.date ?? "")),
		);
	const calculatedTotal = records.reduce(
		(sum, record) => sum + Number(record.actualCost ?? 0),
		0,
	);
	return {
		position: {
			id: position.id,
			code: position.code,
			name: position.name,
		},
		costType: args.costType,
		positionOptions: positions.map(
			({ id, code, name, categoryName, kind, parentId, unit }) => ({
				id,
				code,
				name,
				categoryName,
				kind,
				parentId,
				unit,
			}),
		),
		calculatedTotal: Number(calculatedTotal.toFixed(2)),
		assignedRecords: new Set(
			records.map((record) => `${record.type}:${record.id}`),
		).size,
		pricedRecords: new Set(
			records
				.filter((record) => record.actualCost != null)
				.map((record) => `${record.type}:${record.id}`),
		).size,
		unpricedRecords: new Set(
			records
				.filter((record) => record.actualCost == null)
				.map((record) => `${record.type}:${record.id}`),
		).size,
		records,
	};
}
