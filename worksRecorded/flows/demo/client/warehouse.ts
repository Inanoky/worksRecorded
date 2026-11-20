import type { ComponentProps } from "react";
import type MaterialsTableClient from "@/app/dashboard/sites/[siteId]/BIS/Components/materials-table-client";
import {
	type Forma2ActualSource,
	type Forma2Allocation,
	type Forma2MaterialRule,
	type Forma2Position,
	normalizeForma2MaterialRuleName,
} from "@/flows/default-construction/lib/forma2-analytics";
import { manualMaterialSchema } from "@/lib/bis/manual-material";
import { queryClientWarehouseMaterials } from "@/lib/bis/warehouse-client-query";
import { DEMO_SITE_ID } from "../constants";
import { getData, type LocalData, saveLocal } from "./store";
import sample from "./warehouse-sample.json";

type WarehouseProps = ComponentProps<typeof MaterialsTableClient>;
type MaterialRow = WarehouseProps["materials"][number];
type MaterialSource = Forma2ActualSource & {
	warehouse?: {
		invoiceDate?: string | null;
		createdAt?: string;
		importBatchId?: string;
		declarationAttachment?: MaterialRow["declarationAttachment"];
		agreementAttachment?: MaterialRow["agreementAttachment"];
	};
};

function clientCosts(data = getData()): {
	sources: MaterialSource[];
	positions: Forma2Position[];
	allocations: Forma2Allocation[];
} {
	return data.snapshot.forma2.data.clientCosts;
}

function findMaterial(data: LocalData, id: string) {
	const source = clientCosts(data).sources.find(
		(item) => item.type === "material" && item.id === id,
	);
	if (!source) throw new Error("Materiāls nav atrasts.");
	return source;
}

function asDate(value: string | null | undefined): Date | null {
	return value ? new Date(value) : null;
}

function sourceLabel(source: MaterialSource) {
	return [source.supplierName, source.invoiceNumber]
		.filter(Boolean)
		.join(" · ");
}

export function warehousePositions(data = getData()) {
	return clientCosts(data).positions.filter(
		(position) => position.kind !== "mechanism",
	);
}

export function warehouseRows(data = getData()): MaterialRow[] {
	const { sources, allocations } = clientCosts(data);
	const assignments = new Map(
		allocations
			.filter((allocation) => allocation.sourceType === "material")
			.map((allocation) => [allocation.sourceId, allocation]),
	);
	return sources.flatMap((source) => {
		if (source.type !== "material") return [];
		const assigned = assignments.get(source.id);
		const splitIds = assigned?.split?.parts.map((part) => part.positionId);
		return [
			{
				id: source.id,
				name: source.label,
				quantity: source.quantity,
				cost: source.actualCost,
				measurementUnit: source.unit || null,
				categoryId: null,
				categoryName: null,
				measurementUnitId: null,
				invoiceNr: source.invoiceNumber ?? null,
				invoiceDate: asDate(
					source.warehouse?.invoiceDate === undefined
						? source.invoiceNumber
							? source.date
							: null
						: source.warehouse.invoiceDate,
				),
				materialDate: asDate(source.date),
				supplierName: source.supplierName ?? null,
				importBatchId: source.warehouse?.importBatchId ?? null,
				sourcePhoto: source.invoiceUrl ?? null,
				declarationAttachment: source.warehouse?.declarationAttachment,
				agreementAttachment: source.warehouse?.agreementAttachment,
				createdAt:
					asDate(source.warehouse?.createdAt ?? source.date) ?? new Date(0),
				BISId: null,
				bisStatus: null,
				bisApprovers: [],
				forma2PositionId:
					splitIds?.[0] ??
					assigned?.positionId ??
					source.selectedPositionId ??
					null,
				forma2SplitPositionIds: splitIds,
				forma2AssignmentMethod: assigned?.method ?? null,
				forma2AssignmentConfidence: assigned?.confidence ?? null,
			},
		];
	});
}

function updateMaterial(id: string, change: (source: MaterialSource) => void) {
	saveLocal((draft) => change(findMaterial(draft, id)));
	return { success: true };
}

function warehouseDetails(source: MaterialSource) {
	source.warehouse ??= {};
	const details = source.warehouse;
	if (details.invoiceDate === undefined) {
		details.invoiceDate = source.invoiceNumber ? source.date : null;
	}
	return details;
}

function invoiceGroup(row: MaterialRow, rows: MaterialRow[]) {
	if (row.importBatchId)
		return rows.filter((item) => item.importBatchId === row.importBatchId);
	return row.sourcePhoto
		? rows.filter((item) => item.sourcePhoto === row.sourcePhoto)
		: [row];
}

async function unavailable(): Promise<never> {
	throw new Error("Šai darbībai nepieciešams pieslēgts BIS projekts.");
}

export const warehouseTableActions = {
	exportMaterials: async (_siteId, query) =>
		queryClientWarehouseMaterials(warehouseRows(), query, {
			forma2Positions: warehousePositions(),
		}).allRows,
	updateMaterialDetails: async (id, input) =>
		updateMaterial(id, (source) => {
			const details = warehouseDetails(source);
			if (input.name !== undefined) source.label = input.name ?? "";
			if (input.cost !== undefined) source.actualCost = input.cost;
			if (input.materialDate !== undefined)
				source.date = input.materialDate?.toISOString() ?? null;
			if (input.measurementUnit !== undefined)
				source.unit = input.measurementUnit ?? "";
			if (input.invoiceDate !== undefined)
				details.invoiceDate = input.invoiceDate?.toISOString() ?? null;
			if (input.supplierName !== undefined)
				source.supplierName = input.supplierName;
			source.secondaryLabel = sourceLabel(source);
			source.invoiceLabel = source.secondaryLabel;
		}),
	updateMaterialDate: async (id, date) =>
		updateMaterial(id, (source) => {
			warehouseDetails(source);
			source.date = date?.toISOString() ?? null;
		}),
	updateQuantity: async (id, quantity) =>
		updateMaterial(id, (source) => {
			source.quantity = quantity;
		}),
	updateMaterialAttachments: async (id, input) =>
		updateMaterial(id, (source) => {
			source.warehouse ??= {};
			if (input.sourcePhoto !== undefined)
				source.invoiceUrl = input.sourcePhoto;
			if (input.declarationAttachment !== undefined)
				source.warehouse.declarationAttachment = input.declarationAttachment;
			if (input.agreementAttachment !== undefined)
				source.warehouse.agreementAttachment = input.agreementAttachment;
		}),
	getSourcePhotoPositionCount: async (_siteId, id) => {
		const rows = warehouseRows();
		const row = rows.find((item) => item.id === id);
		return { positionCount: row ? invoiceGroup(row, rows).length : 0 };
	},
	updateRelatedPhotoDates: async (_siteId, id, dates) => {
		const rows = warehouseRows();
		const row = rows.find((item) => item.id === id);
		if (!row) return { updatedCount: 0 };
		const group = invoiceGroup(row, rows);
		saveLocal((draft) => {
			for (const item of group) {
				const source = findMaterial(draft, item.id);
				const details = warehouseDetails(source);
				if (dates.invoiceDate !== undefined)
					details.invoiceDate = dates.invoiceDate?.toISOString() ?? null;
				if (dates.materialDate !== undefined)
					source.date = dates.materialDate?.toISOString() ?? null;
			}
		});
		return { updatedCount: group.length };
	},
	copyMaterialRecord: async (_siteId, id) => {
		const newId = crypto.randomUUID();
		const saved = saveLocal((draft) => {
			const original = findMaterial(draft, id);
			clientCosts(draft).sources.push({
				...original,
				id: newId,
				selectedPositionId: null,
				warehouse: {
					...original.warehouse,
					createdAt: new Date().toISOString(),
				},
			});
		});
		const material = warehouseRows(saved).find((row) => row.id === newId);
		if (!material) throw new Error("Kopētais materiāls nav atrasts.");
		return { success: true, material };
	},
	deleteRecords: async (_siteId, ids) => {
		const selected = new Set(ids);
		const deletedIds = warehouseRows().flatMap((row) =>
			selected.has(row.id) ? [row.id] : [],
		);
		const deleted = new Set(deletedIds);
		saveLocal((draft) => {
			const costs = clientCosts(draft);
			costs.sources = costs.sources.filter(
				(source) => source.type !== "material" || !deleted.has(source.id),
			);
			costs.allocations = costs.allocations.filter(
				(allocation) =>
					allocation.sourceType !== "material" ||
					!deleted.has(allocation.sourceId),
			);
		});
		return { deletedIds };
	},
	sendToBis: unavailable,
	updateSentRecordInBis: unavailable,
	getPossibleApprovers: unavailable,
	submitToApproval: unavailable,
	syncBisRecords: unavailable,
	updateMaterialConfiguration: unavailable,
	createMaterialConfiguration: unavailable,
	attachCertificate: unavailable,
	moveRecordsToProject: unavailable,
} satisfies Pick<
	WarehouseProps,
	| "exportMaterials"
	| "updateMaterialDetails"
	| "updateMaterialDate"
	| "updateQuantity"
	| "updateMaterialAttachments"
	| "getSourcePhotoPositionCount"
	| "updateRelatedPhotoDates"
	| "copyMaterialRecord"
	| "deleteRecords"
	| "sendToBis"
	| "updateSentRecordInBis"
	| "getPossibleApprovers"
	| "submitToApproval"
	| "syncBisRecords"
	| "updateMaterialConfiguration"
	| "createMaterialConfiguration"
	| "attachCertificate"
	| "moveRecordsToProject"
>;

function addMaterial(draft: LocalData, source: MaterialSource) {
	const costs = clientCosts(draft);
	costs.sources.push(source);
	const name = normalizeForma2MaterialRuleName(source.label);
	const rule = draft.materialRules?.find(
		(item) => item.normalizedName === name,
	);
	if (
		rule &&
		costs.positions.some((position) => position.id === rule.positionId)
	) {
		costs.allocations.push(ruleAllocation(rule, source.id));
	}
}

function ruleAllocation(
	rule: Forma2MaterialRule,
	sourceId: string,
): Forma2Allocation {
	return {
		sourceType: "material",
		sourceId,
		positionId: rule.positionId,
		method: "rule",
		confidence: 1,
		assignedAt: new Date().toISOString(),
		ruleId: rule.id,
	};
}

export const warehouseSampleUrl = sample.fileUrl;

export async function readWarehouseSampleUpload(file: File) {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		await file.arrayBuffer(),
	);
	const receipt = Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
	return { receipt, url: receipt === sample.sha256 ? sample.fileUrl : "" };
}

export function importWarehouseSample(receipt: unknown) {
	if (receipt !== sample.sha256) return { ok: false, error: "empty" } as const;
	if (getData().warehouseInvoiceImported)
		return { ok: true, count: sample.lines.length, duplicate: true } as const;
	saveLocal((draft) => {
		const date = `${sample.date}T12:00:00.000Z`;
		for (const line of sample.lines) {
			const label = `${sample.supplierName} · ${sample.invoiceNumber}`;
			addMaterial(draft, {
				id: crypto.randomUUID(),
				type: "material",
				label: line.name,
				secondaryLabel: label,
				invoiceLabel: label,
				invoiceNumber: sample.invoiceNumber,
				supplierName: sample.supplierName,
				invoiceUrl: sample.fileUrl,
				date,
				unit: line.unit,
				quantity: line.quantity,
				hours: null,
				actualCost: line.cost,
				warehouse: {
					invoiceDate: date,
					createdAt: new Date().toISOString(),
					importBatchId: sample.invoiceNumber,
				},
			});
		}
		draft.warehouseInvoiceImported = true;
	});
	return { ok: true, count: sample.lines.length, duplicate: false } as const;
}

function unassignedRows() {
	return warehouseRows().filter((row) => !row.forma2PositionId);
}

export const warehouseLocalActions = {
	saveManualWarehouseMaterial(input: unknown) {
		const result = manualMaterialSchema.safeParse(input);
		if (!result.success || result.data.siteId !== DEMO_SITE_ID)
			return { ok: false, error: "Pārbaudiet materiāla datus." };
		const {
			id,
			name,
			quantity,
			measurementUnit,
			cost,
			materialDate,
			invoiceDate,
			invoiceNr,
			supplierName,
		} = result.data;
		if (!warehouseRows().some((row) => row.id === id)) {
			saveLocal((draft) => {
				const label = [supplierName, invoiceNr].filter(Boolean).join(" · ");
				addMaterial(draft, {
					id,
					type: "material",
					label: name,
					secondaryLabel: label,
					quantity,
					unit: measurementUnit,
					actualCost: cost,
					hours: null,
					invoiceNumber: invoiceNr,
					supplierName,
					invoiceLabel: label,
					date: `${materialDate}T12:00:00.000Z`,
					warehouse: {
						invoiceDate: invoiceDate ? `${invoiceDate}T12:00:00.000Z` : null,
						createdAt: new Date().toISOString(),
					},
				});
			});
		}
		return { ok: true, id };
	},
	getDefaultConstructionForma2MaterialReviewData() {
		const positions = warehousePositions();
		const groups = new Map<
			string,
			{
				normalizedName: string;
				displayName: string;
				representativeSourceId: string;
				count: number;
				totalCost: number;
				units: string[];
				context: string;
			}
		>();
		for (const row of unassignedRows()) {
			const name = normalizeForma2MaterialRuleName(row.name);
			if (name.length < 3) continue;
			const group = groups.get(name) ?? {
				normalizedName: name,
				displayName: row.name ?? name,
				representativeSourceId: row.id,
				count: 0,
				totalCost: 0,
				units: [],
				context: row.supplierName ?? "",
			};
			group.count++;
			group.totalCost += row.cost ?? 0;
			if (row.measurementUnit && !group.units.includes(row.measurementUnit))
				group.units.push(row.measurementUnit);
			groups.set(name, group);
		}
		return {
			enabled: positions.length > 0,
			groups: [...groups.values()].sort((a, b) => b.totalCost - a.totalCost),
			positionOptions: positions,
			rules: (getData().materialRules ?? []).flatMap((rule) => {
				const position = positions.find((item) => item.id === rule.positionId);
				return position
					? [
							{
								...rule,
								positionLabel: `${position.code} ${position.name}`.trim(),
								matchingRecords: warehouseRows().filter(
									(row) =>
										normalizeForma2MaterialRuleName(row.name) ===
										rule.normalizedName,
								).length,
							},
						]
					: [];
			}),
		};
	},
	getDefaultConstructionForma2MaterialGroupDetails({
		normalizedName,
	}: {
		normalizedName: string;
	}) {
		const records = unassignedRows()
			.filter(
				(row) => normalizeForma2MaterialRuleName(row.name) === normalizedName,
			)
			.map((row) => ({
				id: row.id,
				label: row.name ?? normalizedName,
				date: (row.materialDate ?? row.invoiceDate)?.toISOString() ?? null,
				quantity: row.quantity,
				unit: row.measurementUnit ?? "",
				cost: row.cost,
				supplierName: row.supplierName ?? "",
				invoiceNr: row.invoiceNr ?? "",
				categoryName: row.categoryName ?? "",
				costCode: "",
			}));
		return {
			normalizedName,
			records,
			totalCost: records.reduce((sum, row) => sum + (row.cost ?? 0), 0),
		};
	},
	saveDefaultConstructionForma2MaterialRule({
		sourceId,
		positionId,
	}: {
		sourceId: string;
		positionId: string;
	}) {
		const source = findMaterial(getData(), sourceId);
		const normalizedName = normalizeForma2MaterialRuleName(source.label);
		if (
			normalizedName.length < 3 ||
			!warehousePositions().some((position) => position.id === positionId)
		)
			throw new Error("Izvēlieties derīgu materiālu un Formas 2 pozīciju.");
		const id =
			getData().materialRules?.find(
				(rule) => rule.normalizedName === normalizedName,
			)?.id ?? crypto.randomUUID();
		const rule = {
			id,
			normalizedName,
			displayName: source.label,
			positionId,
			createdAt: new Date().toISOString(),
			createdBy: "ozolu-user",
		};
		const selected = new Set(
			unassignedRows()
				.filter(
					(row) => normalizeForma2MaterialRuleName(row.name) === normalizedName,
				)
				.map((row) => row.id),
		);
		selected.add(sourceId);
		saveLocal((draft) => {
			draft.materialRules = [
				...(draft.materialRules ?? []).filter((item) => item.id !== id),
				rule,
			];
			const costs = clientCosts(draft);
			costs.allocations = costs.allocations.filter(
				(allocation) =>
					allocation.sourceType !== "material" ||
					!selected.has(allocation.sourceId),
			);
			for (const id of selected) {
				findMaterial(draft, id).selectedPositionId = null;
				costs.allocations.push(ruleAllocation(rule, id));
			}
		});
		return { assignedRecords: selected.size };
	},
	deleteDefaultConstructionForma2MaterialRule({ ruleId }: { ruleId: string }) {
		saveLocal((draft) => {
			draft.materialRules = (draft.materialRules ?? []).filter(
				(rule) => rule.id !== ruleId,
			);
		});
		return { success: true };
	},
};
