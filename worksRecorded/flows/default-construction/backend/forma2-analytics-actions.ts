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
	type Forma2MaterialRule,
	type Forma2Position,
	type Forma2PositionKind,
	type Forma2SourceType,
	normalizeDefaultConstructionForma2State,
	normalizeForma2MaterialRuleName,
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
				hourlyRate,
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

function isCompatibleMaterialPosition(position: Forma2Position) {
	return (
		position.kind === "material" ||
		(position.kind === "work" && !position.parentId)
	);
}

function materialPositionOptions(positions: Forma2Position[]) {
	return positions.filter(isCompatibleMaterialPosition).map((position) => ({
		id: position.id,
		code: position.code,
		name: position.name,
		categoryName: position.categoryName,
		kind: position.kind,
		parentId: position.parentId,
		unit: position.unit,
	}));
}

function createRuleAllocations(args: {
	sources: Forma2ActualSource[];
	rules: Forma2MaterialRule[];
	existingAllocations: Forma2Allocation[];
	includeSourceIds?: Set<string>;
}) {
	const allocatedSourceIds = new Set(
		args.existingAllocations
			.filter((allocation) => allocation.sourceType === "material")
			.map((allocation) => allocation.sourceId),
	);
	const rulesByName = new Map(
		args.rules.map((rule) => [rule.normalizedName, rule]),
	);
	const assignedAt = new Date().toISOString();
	return args.sources.flatMap((source) => {
		if (
			source.type !== "material" ||
			allocatedSourceIds.has(source.id) ||
			(args.includeSourceIds && !args.includeSourceIds.has(source.id))
		) {
			return [];
		}
		const rule = rulesByName.get(normalizeForma2MaterialRuleName(source.label));
		if (!rule) return [];
		return [
			{
				sourceType: "material" as const,
				sourceId: source.id,
				positionId: rule.positionId,
				method: "rule" as const,
				confidence: 1,
				assignedAt,
				ruleId: rule.id,
			},
		];
	});
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

export async function getDefaultConstructionForma2PositionCostDetails(args: {
	siteId: string;
	positionId: string;
	costType: "work" | "material" | "total";
}) {
	const data = await loadDefaultConstructionForma2Data(args.siteId);
	const positions = data.state.document?.positions ?? [];
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
		data.state.allocations.map((allocation) => [
			`${allocation.sourceType}:${allocation.sourceId}`,
			allocation,
		]),
	);
	const records = data.sources
		.flatMap((source) => {
			if (args.costType !== "total" && source.type !== args.costType) return [];
			const allocation = allocationsBySource.get(`${source.type}:${source.id}`);
			if (!allocation || !includedPositionIds.has(allocation.positionId))
				return [];
			const assignedPosition = positionsById.get(allocation.positionId);
			if (!assignedPosition) return [];
			return [
				{
					id: source.id,
					type: source.type,
					label: source.label,
					secondaryLabel: source.secondaryLabel,
					date: source.date,
					unit: source.unit,
					quantity: source.quantity,
					hours: source.hours,
					hourlyRate: source.hourlyRate ?? null,
					actualCost: source.actualCost,
					assignmentMethod: allocation.method,
					assignmentConfidence: allocation.confidence,
					assignedPosition: {
						id: assignedPosition.id,
						code: assignedPosition.code,
						name: assignedPosition.name,
					},
				},
			];
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
		calculatedTotal: Number(calculatedTotal.toFixed(2)),
		assignedRecords: records.length,
		pricedRecords: records.filter((record) => record.actualCost != null).length,
		unpricedRecords: records.filter((record) => record.actualCost == null)
			.length,
		records,
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
				hourlyRate,
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
		materialRules: existing.materialRules.filter((rule) =>
			positionIds.has(rule.positionId),
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
		method?: "manual" | "automatic" | "rule";
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
			method:
				allocation.method === "automatic" || allocation.method === "rule"
					? allocation.method
					: "manual",
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
		return {
			enabled: false,
			positionOptions: [],
			assignments: [],
			materialRules: [],
		};
	}
	const state = await readStoredState(args.siteId);
	if (!state.document) {
		return {
			enabled: false,
			positionOptions: [],
			assignments: [],
			materialRules: [],
		};
	}
	const sourceIds = new Set(
		(args.sourceIds ?? []).map((sourceId) => text(sourceId, 180)),
	);
	const filterBySource = Array.isArray(args.sourceIds);
	return {
		enabled: true,
		positionOptions: materialPositionOptions(state.document.positions),
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
		materialRules: state.materialRules.map((rule) => ({
			id: rule.id,
			displayName: rule.displayName,
			positionId: rule.positionId,
			createdAt: rule.createdAt,
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
	const validPositionIds = new Set(positions.map((position) => position.id));
	const ruleAllocations = createRuleAllocations({
		sources: data.sources,
		rules: data.state.materialRules.filter((rule) =>
			validPositionIds.has(rule.positionId),
		),
		existingAllocations: data.state.allocations,
	});
	const allocations = await automaticallyAssignForma2Sources({
		sources: data.sources,
		positions,
		existingAllocations: [...data.state.allocations, ...ruleAllocations],
	});
	const newAllocations = [...ruleAllocations, ...allocations];
	if (newAllocations.length) {
		await writeStoredState(siteId, {
			...data.state,
			allocations: [...data.state.allocations, ...newAllocations],
		});
	}
	revalidatePath(`/dashboard/sites/${siteId}/analytics`);
	revalidatePath(`/dashboard/sites/${siteId}/BIS`);
	revalidatePath(`/dashboard/sites/${siteId}/siteDiary`);
	return {
		assignedRecords: newAllocations.length,
		unassignedRecords: Math.max(
			0,
			data.sources.length -
				data.state.allocations.length -
				newAllocations.length,
		),
	};
}

export async function applyDefaultConstructionForma2MaterialRules(args: {
	siteId: string;
	sourceIds?: string[];
}) {
	const access = await getDefaultConstructionSite(args.siteId);
	if (!access.enabled) return { assignedRecords: 0 };
	const state = await readStoredState(args.siteId);
	const positions = state.document?.positions ?? [];
	if (!positions.length || !state.materialRules.length) {
		return { assignedRecords: 0 };
	}
	const sourceIds = args.sourceIds?.map((sourceId) => text(sourceId, 180));
	if (sourceIds && !sourceIds.length) return { assignedRecords: 0 };
	const materialRows = await prisma.bISmaterialRecords.findMany({
		where: {
			siteId: args.siteId,
			...(sourceIds ? { id: { in: sourceIds } } : {}),
		},
		select: { id: true, name: true, invoiceNr: true },
	});
	const sources: Forma2ActualSource[] = materialRows.map((row) => ({
		id: row.id,
		type: "material",
		label: text(row.name) || `Rēķins ${text(row.invoiceNr)}`,
		secondaryLabel: "",
		date: null,
		unit: "",
		quantity: null,
		hours: null,
		actualCost: null,
	}));
	const validPositionIds = new Set(positions.map((position) => position.id));
	const allocations = createRuleAllocations({
		sources,
		rules: state.materialRules.filter((rule) =>
			validPositionIds.has(rule.positionId),
		),
		existingAllocations: state.allocations,
	});
	if (allocations.length) {
		await writeStoredState(args.siteId, {
			...state,
			allocations: [...state.allocations, ...allocations],
		});
		revalidatePath(`/dashboard/sites/${args.siteId}/analytics`);
		revalidatePath(`/dashboard/sites/${args.siteId}/BIS`);
	}
	return { assignedRecords: allocations.length };
}

export async function getDefaultConstructionForma2MaterialReviewData(
	siteId: string,
) {
	const data = await loadDefaultConstructionForma2Data(siteId);
	const positions = data.state.document?.positions ?? [];
	if (!positions.length) {
		return { enabled: false, groups: [], rules: [], positionOptions: [] };
	}
	const validPositionIds = new Set(positions.map((position) => position.id));
	const ruleAllocations = createRuleAllocations({
		sources: data.sources,
		rules: data.state.materialRules.filter((rule) =>
			validPositionIds.has(rule.positionId),
		),
		existingAllocations: data.state.allocations,
	});
	const allocations = [...data.state.allocations, ...ruleAllocations];
	if (ruleAllocations.length) {
		await writeStoredState(siteId, { ...data.state, allocations });
	}
	const allocatedMaterialIds = new Set(
		allocations
			.filter((allocation) => allocation.sourceType === "material")
			.map((allocation) => allocation.sourceId),
	);
	const groupsByName = new Map<
		string,
		{
			normalizedName: string;
			displayName: string;
			representativeSourceId: string;
			count: number;
			totalCost: number;
			units: Set<string>;
			context: string;
		}
	>();
	for (const source of data.sources) {
		if (source.type !== "material" || allocatedMaterialIds.has(source.id))
			continue;
		const normalizedName = normalizeForma2MaterialRuleName(source.label);
		if (normalizedName.length < 3) continue;
		const current = groupsByName.get(normalizedName) ?? {
			normalizedName,
			displayName: source.label,
			representativeSourceId: source.id,
			count: 0,
			totalCost: 0,
			units: new Set<string>(),
			context: source.secondaryLabel,
		};
		current.count += 1;
		current.totalCost += Number(source.actualCost ?? 0);
		if (source.unit) current.units.add(source.unit);
		groupsByName.set(normalizedName, current);
	}
	const positionsById = new Map(
		positions.map((position) => [position.id, position]),
	);
	return {
		enabled: true,
		groups: Array.from(groupsByName.values())
			.sort(
				(left, right) =>
					right.totalCost - left.totalCost ||
					right.count - left.count ||
					left.displayName.localeCompare(right.displayName, "lv"),
			)
			.slice(0, 200)
			.map((group) => ({
				...group,
				totalCost: Number(group.totalCost.toFixed(2)),
				units: Array.from(group.units).slice(0, 4),
			})),
		rules: data.state.materialRules.flatMap((rule) => {
			const position = positionsById.get(rule.positionId);
			if (!position) return [];
			return [
				{
					id: rule.id,
					displayName: rule.displayName,
					positionId: rule.positionId,
					positionLabel: `${position.code ? `${position.code} ` : ""}${position.name}`,
					createdAt: rule.createdAt,
					matchingRecords: data.sources.filter(
						(source) =>
							source.type === "material" &&
							normalizeForma2MaterialRuleName(source.label) ===
								rule.normalizedName,
					).length,
				},
			];
		}),
		positionOptions: materialPositionOptions(positions),
	};
}

export async function getDefaultConstructionForma2MaterialGroupDetails(args: {
	siteId: string;
	normalizedName: string;
}) {
	await requireDefaultConstructionSite(args.siteId);
	const normalizedName = normalizeForma2MaterialRuleName(args.normalizedName);
	if (normalizedName.length < 3) {
		throw new Error("Material group was not found");
	}
	const [state, materialRows] = await Promise.all([
		readStoredState(args.siteId),
		prisma.bISmaterialRecords.findMany({
			where: { siteId: args.siteId },
			orderBy: [
				{ materialDate: "desc" },
				{ invoiceDate: "desc" },
				{ createdAt: "desc" },
			],
			select: {
				id: true,
				name: true,
				quantity: true,
				measurementUnit: true,
				cost: true,
				invoiceNr: true,
				invoiceDate: true,
				materialDate: true,
				supplierName: true,
				categoryName: true,
				costCode: true,
			},
		}),
	]);
	const allocatedMaterialIds = new Set(
		state.allocations
			.filter((allocation) => allocation.sourceType === "material")
			.map((allocation) => allocation.sourceId),
	);
	const records = materialRows.flatMap((row) => {
		const label = text(row.name) || `Rēķins ${text(row.invoiceNr)}`;
		if (
			allocatedMaterialIds.has(row.id) ||
			normalizeForma2MaterialRuleName(label) !== normalizedName
		) {
			return [];
		}
		return [
			{
				id: row.id,
				label,
				date: isoDate(row.materialDate ?? row.invoiceDate),
				quantity: nullableNumber(row.quantity),
				unit: text(row.measurementUnit, 40),
				cost: nullableNumber(row.cost),
				supplierName: text(row.supplierName),
				invoiceNr: text(row.invoiceNr),
				categoryName: text(row.categoryName),
				costCode: text(row.costCode),
			},
		];
	});
	return {
		normalizedName,
		records,
		totalCost: Number(
			records
				.reduce((sum, record) => sum + Number(record.cost ?? 0), 0)
				.toFixed(2),
		),
	};
}

export async function saveDefaultConstructionForma2MaterialRule(args: {
	siteId: string;
	sourceId: string;
	positionId: string;
}) {
	const [data, user] = await Promise.all([
		loadDefaultConstructionForma2Data(args.siteId),
		requireUser(),
	]);
	const positions = data.state.document?.positions ?? [];
	const position = positions.find((item) => item.id === args.positionId);
	if (!position || !isCompatibleMaterialPosition(position)) {
		throw new Error("Forma 2 material position was not found");
	}
	const source = data.sources.find(
		(item) => item.type === "material" && item.id === args.sourceId,
	);
	if (!source) throw new Error("Warehouse material was not found");
	const normalizedName = normalizeForma2MaterialRuleName(source.label);
	if (normalizedName.length < 3) {
		throw new Error("Material name is too short to create a safe rule");
	}
	const previousRule = data.state.materialRules.find(
		(rule) => rule.normalizedName === normalizedName,
	);
	const rule: Forma2MaterialRule = {
		id: previousRule?.id ?? crypto.randomUUID(),
		normalizedName,
		displayName: source.label,
		positionId: position.id,
		createdAt: previousRule?.createdAt ?? new Date().toISOString(),
		createdBy: previousRule?.createdBy ?? user.id,
	};
	const matchingSources = data.sources.filter(
		(item) =>
			item.type === "material" &&
			normalizeForma2MaterialRuleName(item.label) === normalizedName,
	);
	const allocationsBySource = new Map(
		data.state.allocations
			.filter((allocation) => allocation.sourceType === "material")
			.map((allocation) => [allocation.sourceId, allocation]),
	);
	const replaceSourceIds = new Set(
		matchingSources.flatMap((item) => {
			const allocation = allocationsBySource.get(item.id);
			return item.id === args.sourceId || allocation?.method !== "manual"
				? [item.id]
				: [];
		}),
	);
	const assignedAt = new Date().toISOString();
	const ruleAllocations: Forma2Allocation[] = matchingSources
		.filter((item) => replaceSourceIds.has(item.id))
		.map((item) => ({
			sourceType: "material",
			sourceId: item.id,
			positionId: position.id,
			method: "rule",
			confidence: 1,
			assignedAt,
			ruleId: rule.id,
		}));
	const allocations = data.state.allocations.filter(
		(allocation) =>
			allocation.sourceType !== "material" ||
			!replaceSourceIds.has(allocation.sourceId),
	);
	await writeStoredState(args.siteId, {
		...data.state,
		allocations: [...allocations, ...ruleAllocations],
		materialRules: [
			...data.state.materialRules.filter(
				(existingRule) => existingRule.normalizedName !== normalizedName,
			),
			rule,
		],
	});
	revalidatePath(`/dashboard/sites/${args.siteId}/analytics`);
	revalidatePath(`/dashboard/sites/${args.siteId}/BIS`);
	return {
		ruleId: rule.id,
		assignedRecords: ruleAllocations.length,
		skippedManualRecords: matchingSources.length - ruleAllocations.length,
		totalCost: Number(
			matchingSources
				.filter((item) => replaceSourceIds.has(item.id))
				.reduce((sum, item) => sum + Number(item.actualCost ?? 0), 0)
				.toFixed(2),
		),
	};
}

export async function deleteDefaultConstructionForma2MaterialRule(args: {
	siteId: string;
	ruleId: string;
}) {
	await requireDefaultConstructionSite(args.siteId);
	const state = await readStoredState(args.siteId);
	const rules = state.materialRules.filter((rule) => rule.id !== args.ruleId);
	if (rules.length === state.materialRules.length) {
		throw new Error("Material rule was not found");
	}
	await writeStoredState(args.siteId, { ...state, materialRules: rules });
	revalidatePath(`/dashboard/sites/${args.siteId}/BIS`);
	return { deletedRuleId: args.ruleId };
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
