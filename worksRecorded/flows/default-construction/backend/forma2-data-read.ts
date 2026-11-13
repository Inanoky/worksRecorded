import "server-only";
import defaultConfig from "@/components/sitediary/configs/defaultConfig.json";
import {
	buildForma2AnalyticsView,
	DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY,
	type DefaultConstructionForma2State,
	type Forma2ActualSource,
	normalizeDefaultConstructionForma2State,
} from "@/flows/default-construction/lib/forma2-analytics";
import { getForma2DiaryQuantity } from "@/flows/default-construction/lib/forma2-quantities";
import {
	getDefaultConstructionForma2WorkSyncManifest,
	normalizeForma2WorkOptionKey,
} from "@/flows/default-construction/lib/forma2-work-options-manifest";
import { buildDefaultConstructionForma2LegacyWorkEntries } from "@/flows/default-construction/lib/forma2-work-options-sync";
import {
	hasDefaultConstructionQuantityProfile,
	parseDefaultConstructionQuantity,
} from "@/flows/default-construction/lib/quantity-plan-actual";
import {
	calculateDefaultConstructionWorkCost,
	getDefaultConstructionProductivitySettings,
	readDefaultConstructionRecordedCost,
	readDefaultConstructionRecordedHours,
} from "@/flows/default-construction/lib/site-diary-productivity-settings";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { forma2UnmatchedBeginSources } from "../lib/forma2-begin-sources";
import {
	readForma2DrawingQuantities,
	usesForma2DrawingQuantities,
} from "../lib/forma2-drawing-quantities";
import { normalizeForma2QuantityUnit } from "../lib/forma2-quantities";

export function text(value: unknown, maxLength = 500) {
	return String(value ?? "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, maxLength);
}

export function nullableNumber(value: unknown) {
	if (value == null || value === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

export function nonNegative(value: unknown) {
	const parsed = nullableNumber(value);
	return parsed != null && parsed >= 0 ? parsed : 0;
}

export async function requireDefaultConstructionSite(siteId: string) {
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

export function analyticsRoot(value: unknown) {
	return value && typeof value === "object" && !Array.isArray(value)
		? structuredClone(value as Record<string, unknown>)
		: {};
}

export async function readStoredState(siteId: string) {
	const row = await prisma.analytics.findUnique({
		where: { siteId },
		select: { currentWeekProgress: true },
	});
	const root = analyticsRoot(row?.currentWeekProgress);
	return normalizeDefaultConstructionForma2State(
		root[DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY],
	);
}

export function isoDate(value: Date | null | undefined) {
	return value ? value.toISOString() : null;
}

export function getCurrentForma2WorkSelections(
	config: Parameters<typeof getDefaultConstructionForma2WorkSyncManifest>[0],
	state: DefaultConstructionForma2State,
) {
	const document = state.document;
	const manifest = getDefaultConstructionForma2WorkSyncManifest(config);
	if (!document) {
		return {
			positionByWorkKey: new Map<string, string>(),
			workOptions: [] as string[],
		};
	}

	const positionIds = new Set(
		document.positions.map((position) => position.id),
	);
	const legacyEntries = buildDefaultConstructionForma2LegacyWorkEntries(
		document.positions,
	);
	const manifestEntries =
		manifest?.documentId === document.id
			? manifest.entries.filter((entry) => positionIds.has(entry.positionId))
			: [];
	const entriesByWorkKey = new Map(
		legacyEntries.map((entry) => [
			normalizeForma2WorkOptionKey(entry.work),
			entry,
		]),
	);
	for (const entry of manifestEntries) {
		entriesByWorkKey.set(normalizeForma2WorkOptionKey(entry.work), entry);
	}
	const entries = Array.from(entriesByWorkKey.values());
	return {
		positionByWorkKey: new Map(
			entries.map((entry) => [
				normalizeForma2WorkOptionKey(entry.work),
				entry.positionId,
			]),
		),
		workOptions: entries.map((entry) => entry.work),
	};
}

export async function measuredQuantitiesFor(
	siteId: string,
	config: Parameters<typeof usesForma2DrawingQuantities>[0],
) {
	if (!usesForma2DrawingQuantities(config))
		return new Map<string, { quantity: number | null; drawingIds: string[] }>();
	const documents = await prisma.documents.findMany({
		where: {
			siteId,
			documentType: { in: ["limeni-visual-v1", "limeni-visual-preview-v1"] },
		},
		select: {
			id: true,
			documentType: true,
			documentName: true,
			description: true,
			url: true,
			createdAt: true,
		},
	});
	return readForma2DrawingQuantities(documents);
}

export async function loadDefaultConstructionForma2Data(
	siteId: string,
	options: {
		sourceScope?: "all" | "allocated";
		includeDiaryDetails?: boolean;
		authorized?: { siteName: string; siteDiaryRecordsMap: unknown };
		state?: DefaultConstructionForma2State;
		trace?: {
			measure<T>(phase: string, task: () => T | Promise<T>): Promise<T>;
		};
	} = {},
) {
	if (!options.authorized) await requireDefaultConstructionSite(siteId);
	const measure = <T>(phase: string, task: () => T | Promise<T>) =>
		options.trace ? options.trace.measure(phase, task) : task();
	const statePromise = options.state
		? Promise.resolve(options.state)
		: measure("state", () => readStoredState(siteId));
	const allocatedState =
		options.sourceScope === "allocated" ? await statePromise : null;
	const allocatedWorkIds = allocatedState
		? allocatedState.allocations
				.filter((allocation) => allocation.sourceType === "work")
				.map((allocation) => allocation.sourceId)
		: [];
	const allocatedMaterialIds = allocatedState
		? allocatedState.allocations
				.filter((allocation) => allocation.sourceType === "material")
				.map((allocation) => allocation.sourceId)
		: [];
	const allocatedWorkIdSet = new Set(allocatedWorkIds);
	const [state, site, workRows, materialRows] = await Promise.all([
		allocatedState ? Promise.resolve(allocatedState) : statePromise,
		options.authorized
			? Promise.resolve({
					name: options.authorized.siteName,
					siteDiaryRecordsMap: options.authorized.siteDiaryRecordsMap,
				})
			: measure("site", () =>
					prisma.site.findUnique({
						where: { id: siteId },
						select: { name: true, siteDiaryRecordsMap: true },
					}),
				),
		measure("diarySources", () =>
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
					Comments_Custom_1: true,
					Comments: options.includeDiaryDetails === true,
					originalUserComment: options.includeDiaryDetails === true,
					Photos: options.includeDiaryDetails === true,
					TimeInvolved: true,
					evalMetadata: true,
				},
			}),
		),
		measure("materialSources", () =>
			prisma.bISmaterialRecords.findMany({
				where:
					options.sourceScope === "allocated"
						? { siteId, id: { in: allocatedMaterialIds } }
						: { siteId },
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
					sourcePhoto: true,
					invoiceDate: true,
					materialDate: true,
				},
			}),
		),
	]);

	if (!site) throw new Error("Site not found");
	const config =
		site.siteDiaryRecordsMap && typeof site.siteDiaryRecordsMap === "object"
			? (structuredClone(site.siteDiaryRecordsMap) as Parameters<
					typeof getDefaultConstructionProductivitySettings
				>[0])
			: (structuredClone(defaultConfig) as Parameters<
					typeof getDefaultConstructionProductivitySettings
				>[0]);
	const productivity = getDefaultConstructionProductivitySettings(config);
	const { positionByWorkKey } = getCurrentForma2WorkSelections(config, state);
	const settingsByWork = new Map(
		productivity.works.map((setting) => [
			setting.work.trim().toLocaleLowerCase("lv"),
			setting,
		]),
	);

	const measured = await measure("drawingQuantities", () =>
		measuredQuantitiesFor(siteId, config),
	);
	const workSources: Forma2ActualSource[] = workRows
		.filter((row) => text(row.Works))
		.map((row) => {
			const work = text(row.Works);
			const setting = settingsByWork.get(work.toLocaleLowerCase("lv"));
			const recordedHours = readDefaultConstructionRecordedHours(config, row);
			const hours =
				recordedHours === undefined
					? nullableNumber(row.TimeInvolved)
					: recordedHours;
			const unit = text(row.Units, 40);
			const drawingQuantity =
				usesForma2DrawingQuantities(config) &&
				normalizeForma2QuantityUnit(unit) === "m2";
			const quantity = drawingQuantity
				? (measured.get(row.id)?.quantity ?? null)
				: getForma2DiaryQuantity(row, config);
			const cost = calculateDefaultConstructionWorkCost({
				setting,
				unit,
				amount: quantity,
				hours,
				recordedCost: readDefaultConstructionRecordedCost(config, row),
			});
			return {
				id: row.id,
				type: "work",
				selectedPositionId:
					positionByWorkKey.get(normalizeForma2WorkOptionKey(work)) ?? null,
				label: work,
				secondaryLabel: text(row.Location),
				date: isoDate(row.Date),
				unit,
				quantity,
				reportedQuantity: parseDefaultConstructionQuantity(row.Amounts),
				...(drawingQuantity ? { quantitySource: "drawing" as const } : {}),
				...(config.otherSettings?.beginSalaryAllocation?.costSource ===
				"begin-report"
					? { costSource: "begin-report" as const }
					: {}),
				hours,
				hourlyRate: cost.hourlyRate,
				unitRate: cost.unitRate,
				costCalculationMode: cost.mode,
				actualCost: cost.actualCost,
			};
		});
	const scopedWorkSources =
		options.sourceScope === "allocated"
			? workSources.filter(
					(source) =>
						Boolean(source.selectedPositionId) ||
						allocatedWorkIdSet.has(source.id),
				)
			: workSources;

	const materialSources: Forma2ActualSource[] = materialRows.map((row) => ({
		id: row.id,
		invoiceNumber: text(row.invoiceNr) || null,
		supplierName: text(row.supplierName) || null,
		invoiceLabel: [text(row.supplierName), text(row.invoiceNr)]
			.filter(Boolean)
			.join(" · "),
		invoiceUrl:
			row.sourcePhoto && /^https?:\/\//i.test(row.sourcePhoto.trim())
				? row.sourcePhoto.trim()
				: null,
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
		sources: [
			...scopedWorkSources,
			...materialSources,
			...forma2UnmatchedBeginSources(config),
		],
		diaryRecords: options.includeDiaryDetails ? workRows : [],
		hasQuantityProfile: hasDefaultConstructionQuantityProfile(config),
		usesDrawingQuantities: usesForma2DrawingQuantities(config),
	};
}

export function documentMetadata(state: DefaultConstructionForma2State) {
	if (!state.document) return null;
	return {
		id: state.document.id,
		fileName: state.document.fileName,
		sheetName: state.document.sheetName,
		importedAt: state.document.importedAt,
		positionCount: state.document.positions.length,
	};
}

export async function readForma2Results(
	siteId: string,
	options: Parameters<typeof loadDefaultConstructionForma2Data>[1] = {},
) {
	const data = await loadDefaultConstructionForma2Data(siteId, {
		sourceScope: "all",
		...options,
	});
	const positions = data.state.document?.positions ?? [];
	const calculate = () =>
		buildForma2AnalyticsView({
			positions,
			sources: data.sources,
			allocations: data.state.allocations,
			includeSuggestions: false,
		});
	const view = options.trace
		? await options.trace.measure("calculate", calculate)
		: calculate();
	return {
		siteName: data.siteName,
		document: documentMetadata(data.state),
		resultRows: view.resultRows,
		clientCosts: {
			positions,
			sources: data.sources,
			allocations: data.state.allocations,
		},
		...(data.usesDrawingQuantities
			? { quantitySource: "drawing" as const }
			: {}),
	};
}

export async function readAuthorizedForma2Results(
	siteId: string,
	access: { siteName: string; siteDiaryRecordsMap: unknown },
	trace: { measure<T>(phase: string, task: () => T | Promise<T>): Promise<T> },
) {
	const state = await trace.measure("state", () => readStoredState(siteId));
	if (!state.document)
		return {
			siteName: access.siteName,
			document: null,
			resultRows: [],
			clientCosts: { positions: [], sources: [], allocations: [] },
		};
	return trace.measure("results", () =>
		readForma2Results(siteId, { authorized: access, state, trace }),
	);
}
