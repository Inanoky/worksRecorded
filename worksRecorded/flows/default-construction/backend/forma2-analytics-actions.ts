"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import defaultConfig from "@/components/sitediary/configs/defaultConfig.json";
import { automaticallyAssignForma2Sources } from "@/flows/default-construction/backend/forma2-auto-assignment";
import {
	buildForma2AnalyticsView,
	DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY,
	type DefaultConstructionForma2State,
	emptyDefaultConstructionForma2State,
	type Forma2ActualSource,
	type Forma2Allocation,
	type Forma2Position,
	type Forma2PositionKind,
	type Forma2SourceType,
	normalizeDefaultConstructionForma2State,
	suggestForma2Position,
} from "@/flows/default-construction/lib/forma2-analytics";
import { getDefaultConstructionProductivitySettings } from "@/flows/default-construction/lib/site-diary-productivity-settings";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";

const MAX_POSITIONS = 5000;
const MAX_ALLOCATIONS_PER_SAVE = 1000;

function text(value: unknown, maxLength = 500) {
	return String(value ?? "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, maxLength);
}

function nullableNumber(value: unknown) {
	if (value == null || value === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function nonNegative(value: unknown) {
	const parsed = nullableNumber(value);
	return parsed != null && parsed >= 0 ? parsed : 0;
}

function normalizeKind(value: unknown): Forma2PositionKind {
	return value === "material" || value === "mechanism" ? value : "work";
}

function normalizePositions(input: Forma2Position[]) {
	if (!Array.isArray(input) || !input.length) {
		throw new Error("Forma 2 must contain at least one position");
	}
	if (input.length > MAX_POSITIONS) {
		throw new Error(
			`Forma 2 cannot contain more than ${MAX_POSITIONS} positions`,
		);
	}

	const ids = new Set<string>();
	const positions = input.map((raw, index) => {
		const id = text(raw?.id, 180);
		const name = text(raw?.name, 500);
		if (!id || !name)
			throw new Error(`Invalid Forma 2 position at row ${index + 1}`);
		if (ids.has(id)) throw new Error(`Duplicate Forma 2 position: ${id}`);
		ids.add(id);
		return {
			id,
			code: text(raw.code, 40),
			categoryCode: text(raw.categoryCode, 40),
			categoryName: text(raw.categoryName, 300),
			name,
			kind: normalizeKind(raw.kind),
			parentId: raw.parentId ? text(raw.parentId, 180) : null,
			sourceRow: Math.max(1, Math.trunc(Number(raw.sourceRow) || index + 1)),
			unit: text(raw.unit, 40),
			plannedQuantity: nullableNumber(raw.plannedQuantity),
			laborNormHoursPerUnit: nullableNumber(raw.laborNormHoursPerUnit),
			hourlyRate: nullableNumber(raw.hourlyRate),
			plannedWorkCost: nonNegative(raw.plannedWorkCost),
			plannedMaterialCost: nonNegative(raw.plannedMaterialCost),
			plannedMechanismCost: nonNegative(raw.plannedMechanismCost),
			plannedTotalCost: nonNegative(raw.plannedTotalCost),
		} satisfies Forma2Position;
	});

	positions.forEach((position) => {
		if (position.parentId && !ids.has(position.parentId)) {
			throw new Error(`Unknown parent for Forma 2 position: ${position.name}`);
		}
	});
	return positions;
}

async function requireDefaultConstructionSite(siteId: string) {
	const user = await requireUser();
	const site = await orgCheck(user.id, siteId);
	if (!site) throw new Error("Site not found");
	const flowModuleKey = await resolveFlowModuleKeyForRuntime({
		organizationId: site.organizationId ?? null,
		siteId,
	});
	if (flowModuleKey !== FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION) {
		throw new Error(
			"Forma 2 analytics is available only for Default Construction",
		);
	}
	return { user, site };
}

async function getDefaultConstructionSite(siteId: string) {
	const user = await requireUser();
	const site = await orgCheck(user.id, siteId);
	if (!site) throw new Error("Site not found");
	const flowModuleKey = await resolveFlowModuleKeyForRuntime({
		organizationId: site.organizationId ?? null,
		siteId,
	});
	return {
		user,
		site,
		enabled: flowModuleKey === FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION,
	};
}

function analyticsRoot(value: unknown) {
	return value && typeof value === "object" && !Array.isArray(value)
		? structuredClone(value as Record<string, unknown>)
		: {};
}

async function readStoredState(siteId: string) {
	const row = await prisma.analytics.findUnique({
		where: { siteId },
		select: { currentWeekProgress: true },
	});
	const root = analyticsRoot(row?.currentWeekProgress);
	return normalizeDefaultConstructionForma2State(
		root[DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY],
	);
}

async function writeStoredState(
	siteId: string,
	state: DefaultConstructionForma2State,
) {
	const existing = await prisma.analytics.findUnique({
		where: { siteId },
		select: { currentWeekProgress: true },
	});
	const root = analyticsRoot(existing?.currentWeekProgress);
	root[DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY] = state;
	const jsonRoot = root as Prisma.InputJsonObject;
	await prisma.analytics.upsert({
		where: { siteId },
		create: { siteId, currentWeekProgress: jsonRoot },
		update: { currentWeekProgress: jsonRoot },
	});
}

function isoDate(value: Date | null | undefined) {
	return value ? value.toISOString() : null;
}

async function loadDefaultConstructionForma2Data(siteId: string) {
	await requireDefaultConstructionSite(siteId);
	const [state, site, workRows, materialRows] = await Promise.all([
		readStoredState(siteId),
		prisma.site.findUnique({
			where: { id: siteId },
			select: { name: true, siteDiaryRecordsMap: true },
		}),
		prisma.sitediaryrecords.findMany({
			where: { siteId, archivedAt: null, Works: { not: null } },
			orderBy: [{ Date: "desc" }, { createdAt: "desc" }],
			select: {
				id: true,
				Date: true,
				Works: true,
				Location: true,
				Units: true,
				Amounts: true,
				TimeInvolved: true,
			},
		}),
		prisma.bISmaterialRecords.findMany({
			where: { siteId },
			orderBy: [
				{ materialDate: "desc" },
				{ invoiceDate: "desc" },
				{ createdAt: "desc" },
			],
			select: {
				id: true,
				name: true,
				categoryName: true,
				costCode: true,
				quantity: true,
				measurementUnit: true,
				cost: true,
				invoiceNr: true,
				supplierName: true,
				invoiceDate: true,
				materialDate: true,
			},
		}),
	]);

	if (!site) throw new Error("Site not found");
	const config =
		site.siteDiaryRecordsMap && typeof site.siteDiaryRecordsMap === "object"
			? (site.siteDiaryRecordsMap as Parameters<
					typeof getDefaultConstructionProductivitySettings
				>[0])
			: (defaultConfig as Parameters<
					typeof getDefaultConstructionProductivitySettings
				>[0]);
	const productivity = getDefaultConstructionProductivitySettings(config);
	const settingsByWork = new Map(
		productivity.works.map((setting) => [
			setting.work.trim().toLocaleLowerCase("lv"),
			setting,
		]),
	);

	const workSources: Forma2ActualSource[] = workRows
		.filter((row) => text(row.Works))
		.map((row) => {
			const work = text(row.Works);
			const setting = settingsByWork.get(work.toLocaleLowerCase("lv"));
			const hours = nullableNumber(row.TimeInvolved);
			const hourlyRate = nullableNumber(setting?.hourlyCost);
			return {
				id: row.id,
				type: "work",
				label: work,
				secondaryLabel: text(row.Location),
				date: isoDate(row.Date),
				unit: text(row.Units, 40),
				quantity: nullableNumber(row.Amounts),
				hours,
				actualCost:
					hours != null && hourlyRate != null ? hours * hourlyRate : null,
			};
		});

	const materialSources: Forma2ActualSource[] = materialRows.map((row) => ({
		id: row.id,
		type: "material" as const,
		label:
			text(row.name) ||
			(text(row.invoiceNr)
				? `Rēķins ${text(row.invoiceNr)}`
				: "Materiālu izmaksas"),
		secondaryLabel: [
			text(row.categoryName),
			text(row.costCode),
			text(row.supplierName),
			text(row.invoiceNr),
		]
			.filter(Boolean)
			.join(" · "),
		date: isoDate(row.materialDate ?? row.invoiceDate),
		unit: text(row.measurementUnit, 40),
		quantity: nullableNumber(row.quantity),
		hours: null,
		actualCost: nullableNumber(row.cost),
	}));

	return {
		siteName: site.name,
		state,
		sources: [...workSources, ...materialSources],
	};
}

function documentMetadata(state: DefaultConstructionForma2State) {
	if (!state.document) return null;
	return {
		id: state.document.id,
		fileName: state.document.fileName,
		sheetName: state.document.sheetName,
		importedAt: state.document.importedAt,
		positionCount: state.document.positions.length,
	};
}

export async function getDefaultConstructionForma2Dashboard(siteId: string) {
	const data = await loadDefaultConstructionForma2Data(siteId);
	const positions = data.state.document?.positions ?? [];
	return {
		siteName: data.siteName,
		state: data.state,
		view: buildForma2AnalyticsView({
			positions,
			sources: data.sources,
			allocations: data.state.allocations,
		}),
	};
}

export async function getDefaultConstructionForma2Overview(siteId: string) {
	const data = await loadDefaultConstructionForma2Data(siteId);
	const positions = data.state.document?.positions ?? [];
	const view = buildForma2AnalyticsView({
		positions,
		sources: data.sources,
		allocations: data.state.allocations,
		includeSuggestions: false,
	});
	return {
		siteName: data.siteName,
		document: documentMetadata(data.state),
		summary: view.summary,
	};
}

export async function getDefaultConstructionForma2Results(siteId: string) {
	const data = await loadDefaultConstructionForma2Data(siteId);
	const positions = data.state.document?.positions ?? [];
	const view = buildForma2AnalyticsView({
		positions,
		sources: data.sources,
		allocations: data.state.allocations,
		includeSuggestions: false,
	});
	return {
		siteName: data.siteName,
		document: documentMetadata(data.state),
		summary: view.summary,
		resultRows: view.resultRows,
	};
}

export async function getDefaultConstructionForma2MappingPage(args: {
	siteId: string;
	page?: number;
	pageSize?: number;
	sourceType?: "all" | Forma2SourceType;
	assignment?: "all" | "assigned" | "unassigned";
	search?: string;
}) {
	await requireDefaultConstructionSite(args.siteId);
	const [state, site] = await Promise.all([
		readStoredState(args.siteId),
		prisma.site.findUnique({
			where: { id: args.siteId },
			select: { name: true, siteDiaryRecordsMap: true },
		}),
	]);
	if (!site) throw new Error("Site not found");
	const positions = state.document?.positions ?? [];
	const positionIds = new Set(positions.map((position) => position.id));
	const allocationsBySource = new Map(
		state.allocations
			.filter((allocation) => positionIds.has(allocation.positionId))
			.map((allocation) => [
				`${allocation.sourceType}:${allocation.sourceId}`,
				allocation,
			]),
	);
	const sourceType =
		args.sourceType === "work" || args.sourceType === "material"
			? args.sourceType
			: "all";
	const assignment =
		args.assignment === "assigned" || args.assignment === "all"
			? args.assignment
			: "unassigned";
	const search = text(args.search, 120);
	const allocatedWorkIds = Array.from(allocationsBySource.values())
		.filter((allocation) => allocation.sourceType === "work")
		.map((allocation) => allocation.sourceId);
	const allocatedMaterialIds = Array.from(allocationsBySource.values())
		.filter((allocation) => allocation.sourceType === "material")
		.map((allocation) => allocation.sourceId);
	const workWhere: Prisma.sitediaryrecordsWhereInput = {
		siteId: args.siteId,
		archivedAt: null,
		Works: { not: null },
		...(assignment === "assigned"
			? { id: { in: allocatedWorkIds } }
			: assignment === "unassigned"
				? { id: { notIn: allocatedWorkIds } }
				: {}),
		...(search
			? {
					OR: [
						{ Works: { contains: search, mode: "insensitive" } },
						{ Location: { contains: search, mode: "insensitive" } },
						{ Units: { contains: search, mode: "insensitive" } },
					],
				}
			: {}),
	};
	const materialWhere: Prisma.BISmaterialRecordsWhereInput = {
		siteId: args.siteId,
		...(assignment === "assigned"
			? { id: { in: allocatedMaterialIds } }
			: assignment === "unassigned"
				? { id: { notIn: allocatedMaterialIds } }
				: {}),
		...(search
			? {
					OR: [
						{ name: { contains: search, mode: "insensitive" } },
						{ invoiceNr: { contains: search, mode: "insensitive" } },
						{ supplierName: { contains: search, mode: "insensitive" } },
						{ measurementUnit: { contains: search, mode: "insensitive" } },
					],
				}
			: {}),
	};
	const [workCount, materialCount] = await Promise.all([
		sourceType === "material"
			? 0
			: prisma.sitediaryrecords.count({ where: workWhere }),
		sourceType === "work"
			? 0
			: prisma.bISmaterialRecords.count({ where: materialWhere }),
	]);
	const pageSize = Math.min(50, Math.max(10, Math.trunc(args.pageSize ?? 25)));
	const totalRows = workCount + materialCount;
	const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
	const page = Math.min(
		totalPages,
		Math.max(1, Math.trunc(Number(args.page) || 1)),
	);
	const offset = (page - 1) * pageSize;
	const workSkip = Math.min(offset, workCount);
	const workTake = Math.min(pageSize, Math.max(0, workCount - workSkip));
	const materialSkip = Math.max(0, offset - workCount);
	const materialTake = Math.min(
		pageSize - workTake,
		Math.max(0, materialCount - materialSkip),
	);
	const [workRows, materialRows] = await Promise.all([
		workTake
			? prisma.sitediaryrecords.findMany({
					where: workWhere,
					orderBy: [{ Date: "desc" }, { createdAt: "desc" }],
					skip: workSkip,
					take: workTake,
					select: {
						id: true,
						Date: true,
						Works: true,
						Location: true,
						Units: true,
						Amounts: true,
						TimeInvolved: true,
					},
				})
			: [],
		materialTake
			? prisma.bISmaterialRecords.findMany({
					where: materialWhere,
					orderBy: [
						{ materialDate: "desc" },
						{ invoiceDate: "desc" },
						{ createdAt: "desc" },
					],
					skip: materialSkip,
					take: materialTake,
					select: {
						id: true,
						name: true,
						categoryName: true,
						costCode: true,
						quantity: true,
						measurementUnit: true,
						cost: true,
						invoiceNr: true,
						supplierName: true,
						invoiceDate: true,
						materialDate: true,
					},
				})
			: [],
	]);
	const config =
		site.siteDiaryRecordsMap && typeof site.siteDiaryRecordsMap === "object"
			? (site.siteDiaryRecordsMap as Parameters<
					typeof getDefaultConstructionProductivitySettings
				>[0])
			: (defaultConfig as Parameters<
					typeof getDefaultConstructionProductivitySettings
				>[0]);
	const settingsByWork = new Map(
		getDefaultConstructionProductivitySettings(config).works.map((setting) => [
			setting.work.trim().toLocaleLowerCase("lv"),
			setting,
		]),
	);
	const workSources: Forma2ActualSource[] = workRows
		.filter((row) => text(row.Works))
		.map((row) => {
			const work = text(row.Works);
			const setting = settingsByWork.get(work.toLocaleLowerCase("lv"));
			const hours = nullableNumber(row.TimeInvolved);
			const hourlyRate = nullableNumber(setting?.hourlyCost);
			return {
				id: row.id,
				type: "work",
				label: work,
				secondaryLabel: text(row.Location),
				date: isoDate(row.Date),
				unit: text(row.Units, 40),
				quantity: nullableNumber(row.Amounts),
				hours,
				actualCost:
					hours != null && hourlyRate != null ? hours * hourlyRate : null,
			};
		});
	const materialSources: Forma2ActualSource[] = materialRows.map((row) => ({
		id: row.id,
		type: "material" as const,
		label:
			text(row.name) ||
			(text(row.invoiceNr)
				? `Rēķins ${text(row.invoiceNr)}`
				: "Materiālu izmaksas"),
		secondaryLabel: [
			text(row.categoryName),
			text(row.costCode),
			text(row.supplierName),
			text(row.invoiceNr),
		]
			.filter(Boolean)
			.join(" · "),
		date: isoDate(row.materialDate ?? row.invoiceDate),
		unit: text(row.measurementUnit, 40),
		quantity: nullableNumber(row.quantity),
		hours: null,
		actualCost: nullableNumber(row.cost),
	}));
	const pageSources = [...workSources, ...materialSources];
	const pageView = buildForma2AnalyticsView({
		positions,
		sources: pageSources,
		allocations: state.allocations,
	});

	return {
		siteName: site.name,
		document: documentMetadata(state),
		rows: pageView.mappingRows,
		positionOptions: positions
			.filter(
				(position) => position.kind === "work" || position.kind === "material",
			)
			.map((position) => ({
				id: position.id,
				code: position.code,
				name: position.name,
				kind: position.kind as Forma2SourceType,
				parentId: position.parentId,
				categoryName: position.categoryName,
			})),
		pagination: {
			page,
			pageSize,
			totalRows,
			totalPages,
		},
		filters: { sourceType, assignment, search: text(args.search, 120) },
	};
}

export async function saveDefaultConstructionForma2Import(args: {
	siteId: string;
	fileName: string;
	sheetName: string;
	positions: Forma2Position[];
}) {
	await requireDefaultConstructionSite(args.siteId);
	const positions = normalizePositions(args.positions);
	const existing = await readStoredState(args.siteId);
	const positionIds = new Set(positions.map((position) => position.id));
	const state: DefaultConstructionForma2State = {
		version: 1,
		document: {
			id: crypto.randomUUID(),
			fileName: text(args.fileName, 240) || "Forma 2.xlsx",
			sheetName: text(args.sheetName, 120),
			importedAt: new Date().toISOString(),
			positions,
		},
		allocations: existing.allocations.filter((allocation) =>
			positionIds.has(allocation.positionId),
		),
	};
	await writeStoredState(args.siteId, state);
	revalidatePath(`/dashboard/sites/${args.siteId}/analytics`);
	revalidatePath(`/dashboard/sites/${args.siteId}/BIS`);
	return { importedPositions: positions.length };
}

export async function saveDefaultConstructionForma2Allocations(args: {
	siteId: string;
	allocations: Array<{
		sourceType: Forma2SourceType;
		sourceId: string;
		positionId: string | null;
		method?: "manual" | "automatic";
		confidence?: number | null;
	}>;
}) {
	await requireDefaultConstructionSite(args.siteId);
	if (
		!Array.isArray(args.allocations) ||
		args.allocations.length > MAX_ALLOCATIONS_PER_SAVE
	) {
		throw new Error("Too many Forma 2 allocations in one save");
	}
	const state = await readStoredState(args.siteId);
	if (!state.document)
		throw new Error("Import Forma 2 before assigning records");
	const positionsById = new Map(
		state.document.positions.map((position) => [position.id, position]),
	);
	const workIds = args.allocations
		.filter((allocation) => allocation.sourceType === "work")
		.map((allocation) => allocation.sourceId);
	const materialIds = args.allocations
		.filter((allocation) => allocation.sourceType === "material")
		.map((allocation) => allocation.sourceId);
	const [validWorkRows, validMaterialRows] = await Promise.all([
		workIds.length
			? prisma.sitediaryrecords.findMany({
					where: { siteId: args.siteId, id: { in: workIds }, archivedAt: null },
					select: { id: true },
				})
			: [],
		materialIds.length
			? prisma.bISmaterialRecords.findMany({
					where: { siteId: args.siteId, id: { in: materialIds } },
					select: { id: true },
				})
			: [],
	]);
	const validSources = new Set([
		...validWorkRows.map((row) => `work:${row.id}`),
		...validMaterialRows.map((row) => `material:${row.id}`),
	]);
	const replacements = new Map<string, Forma2Allocation | null>();

	args.allocations.forEach((allocation) => {
		const sourceKey = `${allocation.sourceType}:${text(allocation.sourceId, 180)}`;
		if (!validSources.has(sourceKey))
			throw new Error("Factual record was not found");
		if (!allocation.positionId) {
			replacements.set(sourceKey, null);
			return;
		}
		const position = positionsById.get(allocation.positionId);
		if (!position) throw new Error("Forma 2 position was not found");
		const compatible =
			allocation.sourceType === "work"
				? position.kind === "work"
				: position.kind === "material" ||
					(position.kind === "work" && !position.parentId);
		if (!compatible) {
			throw new Error(
				"The factual record is not compatible with this Forma 2 position",
			);
		}
		replacements.set(sourceKey, {
			sourceType: allocation.sourceType,
			sourceId: text(allocation.sourceId, 180),
			positionId: position.id,
			method: allocation.method === "automatic" ? "automatic" : "manual",
			confidence:
				allocation.confidence == null
					? null
					: Math.max(0, Math.min(1, Number(allocation.confidence) || 0)),
			assignedAt: new Date().toISOString(),
		});
	});

	const nextAllocations = state.allocations.filter(
		(allocation) =>
			!replacements.has(`${allocation.sourceType}:${allocation.sourceId}`),
	);
	replacements.forEach((allocation) => {
		if (allocation) nextAllocations.push(allocation);
	});
	await writeStoredState(args.siteId, {
		...state,
		allocations: nextAllocations,
	});
	revalidatePath(`/dashboard/sites/${args.siteId}/analytics`);
	revalidatePath(`/dashboard/sites/${args.siteId}/BIS`);
	revalidatePath(`/dashboard/sites/${args.siteId}/siteDiary`);
	return { savedAllocations: replacements.size };
}

export async function getDefaultConstructionForma2MaterialAssignments(args: {
	siteId: string;
	sourceIds?: string[];
}) {
	const access = await getDefaultConstructionSite(args.siteId);
	if (!access.enabled) {
		return { enabled: false, positionOptions: [], assignments: [] };
	}
	const state = await readStoredState(args.siteId);
	if (!state.document) {
		return { enabled: false, positionOptions: [], assignments: [] };
	}
	const sourceIds = new Set(
		(args.sourceIds ?? []).map((sourceId) => text(sourceId, 180)),
	);
	const filterBySource = Array.isArray(args.sourceIds);
	return {
		enabled: true,
		positionOptions: state.document.positions
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
			})),
		assignments: state.allocations
			.filter(
				(allocation) =>
					allocation.sourceType === "material" &&
					(!filterBySource || sourceIds.has(allocation.sourceId)),
			)
			.map((allocation) => ({
				sourceId: allocation.sourceId,
				positionId: allocation.positionId,
				method: allocation.method,
				confidence: allocation.confidence,
			})),
	};
}

export async function runDefaultConstructionForma2AutoAssignment(
	siteId: string,
) {
	const data = await loadDefaultConstructionForma2Data(siteId);
	const positions = data.state.document?.positions;
	if (!positions?.length)
		throw new Error("Import Forma 2 before assigning records");
	const allocations = await automaticallyAssignForma2Sources({
		sources: data.sources,
		positions,
		existingAllocations: data.state.allocations,
	});
	if (allocations.length) {
		await writeStoredState(siteId, {
			...data.state,
			allocations: [...data.state.allocations, ...allocations],
		});
	}
	revalidatePath(`/dashboard/sites/${siteId}/analytics`);
	revalidatePath(`/dashboard/sites/${siteId}/BIS`);
	revalidatePath(`/dashboard/sites/${siteId}/siteDiary`);
	return {
		assignedRecords: allocations.length,
		unassignedRecords: Math.max(
			0,
			data.sources.length - data.state.allocations.length - allocations.length,
		),
	};
}

export async function syncDefaultConstructionForma2WorkAssignments(args: {
	siteId: string;
	records: Array<{ id: string; work: string | null | undefined }>;
}) {
	const access = await getDefaultConstructionSite(args.siteId);
	if (!access.enabled || !args.records.length) return { syncedRecords: 0 };
	const state = await readStoredState(args.siteId);
	const positions = state.document?.positions;
	if (!positions?.length) return { syncedRecords: 0 };
	const recordIds = args.records.map((record) => text(record.id, 180));
	const existingIds = new Set(
		(
			await prisma.sitediaryrecords.findMany({
				where: { siteId: args.siteId, id: { in: recordIds }, archivedAt: null },
				select: { id: true },
			})
		).map((record) => record.id),
	);
	const replacements = new Map<string, Forma2Allocation | null>();
	for (const record of args.records) {
		const sourceId = text(record.id, 180);
		if (!existingIds.has(sourceId)) continue;
		const suggestion = suggestForma2Position(
			{
				id: sourceId,
				type: "work",
				label: text(record.work),
				secondaryLabel: "",
				date: null,
				unit: "",
				quantity: null,
				hours: null,
				actualCost: null,
			},
			positions,
		);
		replacements.set(
			sourceId,
			suggestion && suggestion.confidence >= 0.9
				? {
						sourceType: "work",
						sourceId,
						positionId: suggestion.positionId,
						method: "manual",
						confidence: suggestion.confidence,
						assignedAt: new Date().toISOString(),
					}
				: null,
		);
	}
	const allocations = state.allocations.filter(
		(allocation) =>
			allocation.sourceType !== "work" ||
			!replacements.has(allocation.sourceId),
	);
	for (const allocation of replacements.values()) {
		if (allocation) allocations.push(allocation);
	}
	await writeStoredState(args.siteId, { ...state, allocations });
	revalidatePath(`/dashboard/sites/${args.siteId}/analytics`);
	return { syncedRecords: replacements.size };
}

export async function clearDefaultConstructionForma2Import(siteId: string) {
	await requireDefaultConstructionSite(siteId);
	await writeStoredState(siteId, emptyDefaultConstructionForma2State());
	revalidatePath(`/dashboard/sites/${siteId}/analytics`);
	revalidatePath(`/dashboard/sites/${siteId}/BIS`);
}
