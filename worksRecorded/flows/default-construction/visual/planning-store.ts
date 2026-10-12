import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { getDefaultConstructionQuantityComparison } from "@/flows/default-construction/lib/quantity-plan-actual";
import { getDefaultConstructionOptionValues } from "@/flows/default-construction/lib/site-diary-productivity-settings";
import {
	addDays,
	normalizePlanText,
	planMatchKey,
	plannerToday,
} from "@/flows/default-construction/planner/model";
import { prisma } from "@/lib/utils/db";
import {
	compareVisualPlanProgress,
	findVisualPlanConflict,
	VISUAL_PLAN_TYPE,
	type VisualPlan,
	visualPlanAreasSchema,
	visualPlanInputSchema,
} from "./planning-model";
import { loadVisualDrawing, requireVisualAccess } from "./store";

type StoredVisualPlan = {
	id: string;
	version: number;
	visualDrawingId: string | null;
	work: string;
	location: string;
	unit: string;
	quantity: number;
	startDate: Date | null;
	date: Date;
	visualAreas: Prisma.JsonValue | null;
	geometryReviewRequired: boolean;
	archivedAt: Date | null;
};

export class VisualPlanConflictError extends Error {
	constructor(public readonly conflict: VisualPlan) {
		super("Šis darbs jau ir ieplānots periodā, kas pārklājas.");
	}
}

function dateOnly(date: Date) {
	return date.toISOString().slice(0, 10);
}

export function serializeVisualPlan(row: StoredVisualPlan): VisualPlan {
	if (!row.startDate) throw new Error("Vizuālajam plānam nav sākuma datuma.");
	return {
		id: row.id,
		version: row.version,
		drawingId: row.visualDrawingId,
		work: row.work,
		location: row.location,
		unit: row.unit,
		quantity: row.quantity,
		startDate: dateOnly(row.startDate),
		endDate: dateOnly(row.date),
		geometry: visualPlanAreasSchema.parse(row.visualAreas),
		geometryReviewRequired: row.geometryReviewRequired,
		archivedAt: row.archivedAt?.toISOString() ?? null,
	};
}

function revisionSnapshot(row: StoredVisualPlan) {
	return {
		...serializeVisualPlan(row),
		planType: VISUAL_PLAN_TYPE,
	};
}

async function loadPlanningSite(
	db: Pick<typeof prisma, "site">,
	siteId: string,
	organizationId: string,
) {
	const site = await db.site.findFirst({
		where: { id: siteId, organizationId },
		select: { siteDiaryRecordsMap: true },
	});
	if (!site) throw new Error("Projekts nav atrasts.");
	return site;
}

function canonicalOption(value: string, options: string[]) {
	return options.find(
		(option) => normalizePlanText(option) === normalizePlanText(value),
	);
}

async function canonicalizeInput(
	input: z.infer<typeof visualPlanInputSchema>,
	organizationId: string,
) {
	const site = await loadPlanningSite(prisma, input.siteId, organizationId);
	const options = getDefaultConstructionOptionValues(
		(site.siteDiaryRecordsMap ?? {}) as Record<string, unknown>,
	);
	const workSetting = options.productivity.works.find(
		(option) =>
			normalizePlanText(option.work) === normalizePlanText(input.work),
	);
	if (!workSetting) throw new Error("Izvēlieties projektā pieejamu darbu.");
	const unit = workSetting.unit
		? canonicalOption(workSetting.unit, [input.unit])
			? input.unit
			: null
		: canonicalOption(input.unit, options.units);
	if (!unit)
		throw new Error("Izvēlieties darbam projektā pieejamu mērvienību.");
	return {
		...input,
		work: workSetting.work,
		unit: workSetting.unit || unit,
		workOptions: options.productivity.works.map((option) => ({
			work: option.work,
			unit: option.unit,
		})),
		unitOptions: options.units,
	};
}

async function createRevision(
	tx: Prisma.TransactionClient,
	row: StoredVisualPlan,
	action: "create" | "update" | "archive" | "restore",
	actorId: string,
) {
	await tx.constructionPlanRevision.create({
		data: {
			planId: row.id,
			version: row.version,
			action,
			snapshot: revisionSnapshot(row),
			actorId,
		},
	});
}

export async function listVisualPlans(
	userId: string,
	siteId: string,
	drawingId: string,
) {
	const { row: drawingRow, drawing } = await loadVisualDrawing(
		userId,
		siteId,
		drawingId,
	);
	if (!drawingRow.organizationId)
		throw new Error("Rasējuma organizācija nav atrasta.");
	const site = await loadPlanningSite(
		prisma,
		siteId,
		drawingRow.organizationId,
	);
	const options = getDefaultConstructionOptionValues(
		(site.siteDiaryRecordsMap ?? {}) as Record<string, unknown>,
	);
	const rows = await prisma.constructionPlan.findMany({
		where: { siteId, planType: VISUAL_PLAN_TYPE },
		orderBy: [{ archivedAt: "asc" }, { startDate: "asc" }, { date: "asc" }],
	});
	const plans = (rows as unknown as StoredVisualPlan[])
		.map(serializeVisualPlan)
		.filter(
			(plan) =>
				normalizePlanText(plan.location) ===
				normalizePlanText(drawing.state.location),
		);
	const firstStart = plans.reduce<string | null>(
		(first, plan) =>
			!first || plan.startDate < first ? plan.startDate : first,
		null,
	);
	const actualRows = firstStart
		? await prisma.sitediaryrecords.findMany({
				where: {
					siteId,
					organizationId: drawingRow.organizationId,
					archivedAt: null,
					Date: { gte: new Date(addDays(firstStart, -1)) },
				},
				select: {
					id: true,
					Date: true,
					Works: true,
					Location: true,
					Units: true,
					Amounts: true,
					Comments_Custom_1: true,
				},
			})
		: [];
	const config = (site.siteDiaryRecordsMap ?? {}) as Record<string, unknown>;
	const actuals = actualRows.flatMap((actual) => {
		if (!actual.Date) return [];
		const quantity = getDefaultConstructionQuantityComparison(actual, config);
		return [
			{
				id: actual.id,
				date: plannerToday(actual.Date),
				work: actual.Works ?? "",
				location: actual.Location ?? "",
				unit: actual.Units ?? "",
				quantity: quantity.enabled ? quantity.actualAmount : actual.Amounts,
			},
		];
	});
	const today = plannerToday();
	return {
		today,
		location: drawing.state.location,
		workOptions: options.productivity.works.map((option) => ({
			work: option.work,
			unit: option.unit,
		})),
		unitOptions: options.units,
		plans: plans.map((plan) => ({
			...plan,
			progress: compareVisualPlanProgress(plan, actuals, today),
		})),
	};
}

export async function persistVisualPlan(userId: string, rawInput: unknown) {
	const input = visualPlanInputSchema.parse(rawInput);
	const { row: drawingRow, drawing } = await loadVisualDrawing(
		userId,
		input.siteId,
		input.drawingId,
	);
	if (!drawingRow.organizationId)
		throw new Error("Rasējuma organizācija nav atrasta.");
	if (
		normalizePlanText(input.location) !==
		normalizePlanText(drawing.state.location)
	)
		throw new Error("Plāna stāvs neatbilst izvēlētajam rasējumam.");
	const canonical = await canonicalizeInput(input, drawingRow.organizationId);
	return prisma.$transaction(
		async (tx) => {
			await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`visual-plan:${input.siteId}:${planMatchKey(canonical.work, drawing.state.location, canonical.unit)}`}))`;
			const existingRows = await tx.constructionPlan.findMany({
				where: {
					siteId: input.siteId,
					planType: VISUAL_PLAN_TYPE,
					matchKey: planMatchKey(
						canonical.work,
						drawing.state.location,
						canonical.unit,
					),
					archivedAt: null,
				},
			});
			const candidate: VisualPlan = {
				id: input.id ?? "new",
				version: input.version ?? 1,
				drawingId: input.drawingId,
				work: canonical.work,
				location: drawing.state.location,
				unit: canonical.unit,
				quantity: input.quantity,
				startDate: input.startDate,
				endDate: input.endDate,
				geometry: input.geometry,
				geometryReviewRequired: false,
				archivedAt: null,
			};
			const conflict = findVisualPlanConflict(
				candidate,
				(existingRows as unknown as StoredVisualPlan[]).map(
					serializeVisualPlan,
				),
			);
			if (conflict) throw new VisualPlanConflictError(conflict);
			const data = {
				planType: VISUAL_PLAN_TYPE,
				startDate: new Date(input.startDate),
				date: new Date(input.endDate),
				work: canonical.work,
				location: drawing.state.location,
				unit: canonical.unit,
				quantity: input.quantity,
				matchKey: planMatchKey(
					canonical.work,
					drawing.state.location,
					canonical.unit,
				),
				visualDrawingId: input.drawingId,
				visualAreas: input.geometry,
				geometryReviewRequired: false,
				updatedBy: userId,
			};
			let saved: StoredVisualPlan;
			let action: "create" | "update";
			if (!input.id) {
				saved = (await tx.constructionPlan.create({
					data: {
						...data,
						siteId: input.siteId,
						createdBy: userId,
					},
				})) as unknown as StoredVisualPlan;
				action = "create";
			} else {
				if (!input.version)
					throw new Error("Trūkst plāna versijas. Atjaunojiet skatu.");
				const updated = await tx.constructionPlan.updateMany({
					where: {
						id: input.id,
						siteId: input.siteId,
						planType: VISUAL_PLAN_TYPE,
						version: input.version,
						archivedAt: null,
					},
					data: { ...data, version: { increment: 1 } },
				});
				if (updated.count !== 1)
					throw new Error(
						"Plāns jau ir mainīts vai arhivēts. Atjaunojiet skatu.",
					);
				saved = (await tx.constructionPlan.findUniqueOrThrow({
					where: { id: input.id },
				})) as unknown as StoredVisualPlan;
				action = "update";
			}
			await createRevision(tx, saved, action, userId);
			return serializeVisualPlan(saved);
		},
		{ isolationLevel: "Serializable" },
	);
}

const visualPlanMutationSchema = z
	.object({
		siteId: z.string().uuid(),
		id: z.string().uuid(),
		version: z.number().int().positive(),
	})
	.strict();

export async function archiveVisualPlan(userId: string, rawInput: unknown) {
	const input = visualPlanMutationSchema.parse(rawInput);
	await requireVisualAccess(userId, input.siteId);
	return prisma.$transaction(async (tx) => {
		const changed = await tx.constructionPlan.updateMany({
			where: {
				id: input.id,
				siteId: input.siteId,
				planType: VISUAL_PLAN_TYPE,
				version: input.version,
				archivedAt: null,
			},
			data: {
				archivedAt: new Date(),
				archivedBy: userId,
				updatedBy: userId,
				version: { increment: 1 },
			},
		});
		if (changed.count !== 1)
			throw new Error("Plāns jau ir mainīts vai arhivēts. Atjaunojiet skatu.");
		const saved = (await tx.constructionPlan.findUniqueOrThrow({
			where: { id: input.id },
		})) as unknown as StoredVisualPlan;
		await createRevision(tx, saved, "archive", userId);
		return serializeVisualPlan(saved);
	});
}

export async function restoreVisualPlan(userId: string, rawInput: unknown) {
	const input = visualPlanMutationSchema.parse(rawInput);
	await requireVisualAccess(userId, input.siteId);
	return prisma.$transaction(
		async (tx) => {
			const row = (await tx.constructionPlan.findFirst({
				where: {
					id: input.id,
					siteId: input.siteId,
					planType: VISUAL_PLAN_TYPE,
					version: input.version,
					archivedAt: { not: null },
				},
			})) as unknown as StoredVisualPlan | null;
			if (!row)
				throw new Error("Arhivētais plāns jau ir mainīts. Atjaunojiet skatu.");
			await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`visual-plan:${input.siteId}:${planMatchKey(row.work, row.location, row.unit)}`}))`;
			const active = await tx.constructionPlan.findMany({
				where: {
					siteId: input.siteId,
					planType: VISUAL_PLAN_TYPE,
					matchKey: planMatchKey(row.work, row.location, row.unit),
					archivedAt: null,
				},
			});
			const archived = serializeVisualPlan(row);
			const conflict = findVisualPlanConflict(
				archived,
				(active as unknown as StoredVisualPlan[]).map(serializeVisualPlan),
			);
			if (conflict) throw new VisualPlanConflictError(conflict);
			const changed = await tx.constructionPlan.updateMany({
				where: {
					id: input.id,
					siteId: input.siteId,
					planType: VISUAL_PLAN_TYPE,
					version: input.version,
					archivedAt: { not: null },
				},
				data: {
					archivedAt: null,
					archivedBy: null,
					updatedBy: userId,
					version: { increment: 1 },
				},
			});
			if (changed.count !== 1)
				throw new Error("Arhivētais plāns jau ir mainīts. Atjaunojiet skatu.");
			const saved = (await tx.constructionPlan.findUniqueOrThrow({
				where: { id: input.id },
			})) as unknown as StoredVisualPlan;
			await createRevision(tx, saved, "restore", userId);
			return serializeVisualPlan(saved);
		},
		{ isolationLevel: "Serializable" },
	);
}
