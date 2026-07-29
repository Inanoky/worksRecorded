"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import defaultConfig from "@/components/sitediary/configs/defaultConfig.json";
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

export async function getDefaultConstructionForma2Dashboard(siteId: string) {
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
		type: "material",
		label:
			text(row.name) ||
			(text(row.invoiceNr)
				? `Rēķins ${text(row.invoiceNr)}`
				: "Materiālu izmaksas"),
		secondaryLabel: [text(row.supplierName), text(row.invoiceNr)]
			.filter(Boolean)
			.join(" · "),
		date: isoDate(row.materialDate ?? row.invoiceDate),
		unit: text(row.measurementUnit, 40),
		quantity: nullableNumber(row.quantity),
		hours: null,
		actualCost: nullableNumber(row.cost),
	}));

	const sources = [...workSources, ...materialSources];
	const positions = state.document?.positions ?? [];
	return {
		siteName: site.name,
		state,
		view: buildForma2AnalyticsView({
			positions,
			sources,
			allocations: state.allocations,
		}),
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
		const expectedKind = allocation.sourceType === "work" ? "work" : "material";
		if (position.kind !== expectedKind) {
			throw new Error(
				"Work and material records must be assigned to matching position types",
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
	return { savedAllocations: replacements.size };
}

export async function clearDefaultConstructionForma2Import(siteId: string) {
	await requireDefaultConstructionSite(siteId);
	await writeStoredState(siteId, emptyDefaultConstructionForma2State());
	revalidatePath(`/dashboard/sites/${siteId}/analytics`);
}
