"use server";

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import defaultConfig from "@/components/sitediary/configs/defaultConfig.json";
import { getDefaultConstructionQuantityComparison } from "@/flows/default-construction/lib/quantity-plan-actual";
import {
	DEFAULT_CONSTRUCTION_PRODUCTIVITY_SETTINGS_KEY,
	getDefaultConstructionOptionValues,
	setDefaultConstructionWorkDropdownOptions,
} from "@/flows/default-construction/lib/site-diary-productivity-settings";
import {
	addDays,
	assertFuture,
	comparePlans,
	normalizePlanText,
	type Plan,
	planMatchKey,
	plannerToday,
	planSchema,
	weekStart,
} from "@/flows/default-construction/planner/model";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { prisma } from "@/lib/utils/db";

async function authorize(siteId: string) {
	z.string().uuid().parse(siteId);
	const session = await getKindeServerSession().getUser();
	if (!session) throw new Error("Nav piekļuves.");
	const user = await prisma.user.findUnique({
		where: { id: session.id },
		select: { organizationId: true, status: true },
	});
	if (
		!user?.organizationId ||
		(user.status !== null && user.status !== "active")
	)
		throw new Error("Nav piekļuves.");
	const site = await prisma.site.findFirst({
		where: { id: siteId, organizationId: user.organizationId },
		select: {
			id: true,
			organizationId: true,
			siteDiaryRecordsMap: true,
			updatedAt: true,
		},
	});
	if (
		!site ||
		(await resolveFlowModuleKeyForRuntime({
			organizationId: site.organizationId,
			siteId,
		})) !== "default-construction"
	)
		throw new Error("Nav piekļuves.");
	return { site, userId: session.id };
}

function configMap(value: unknown) {
	return structuredClone(
		value && typeof value === "object" ? value : defaultConfig,
	) as Prisma.JsonObject;
}
function serialize(plan: {
	id: string;
	date: Date;
	work: string;
	location: string;
	unit: string;
	quantity: number;
	version: number;
}): Plan {
	return {
		id: plan.id,
		date: plan.date.toISOString().slice(0, 10),
		work: plan.work,
		location: plan.location,
		unit: plan.unit,
		quantity: plan.quantity,
		version: plan.version,
	};
}
function invalidate(siteId: string) {
	revalidatePath(`/dashboard/sites/${siteId}/siteDiary`);
	revalidatePath(`/dashboard/sites/${siteId}/dashboard`);
}
function failure(error: unknown) {
	if (error instanceof z.ZodError)
		return "Pārbaudiet datumu, darbu, vietu, mērvienību un pozitīvu daudzumu.";
	const code = (error as { code?: string })?.code;
	if (code === "P2002")
		return "Šajā datumā šis darbs, vieta un mērvienība jau ir plānā. Rediģējiet esošo rindu.";
	if (code === "P2021") return "Plānotājs vēl nav aktivizēts datubāzē.";
	if (code) return "Neizdevās saglabāt. Atjaunojiet plānu un mēģiniet vēlreiz.";
	return error instanceof Error ? error.message : "Neizdevās saglabāt.";
}

export async function loadConstructionWeek(siteId: string, date: string) {
	const { site } = await authorize(siteId);
	const start = weekStart(date);
	const end = addDays(start, 7);
	const config = configMap(site.siteDiaryRecordsMap);
	const options = getDefaultConstructionOptionValues(config);
	try {
		const [plans, actuals] = await Promise.all([
			prisma.constructionPlan.findMany({
				where: { siteId, date: { gte: new Date(start), lt: new Date(end) } },
				orderBy: [{ date: "asc" }, { createdAt: "asc" }],
			}),
			prisma.sitediaryrecords.findMany({
				where: {
					siteId,
					archivedAt: null,
					Date: { gte: new Date(addDays(start, -1)), lt: new Date(end) },
				},
				select: {
					id: true,
					Date: true,
					Works: true,
					Location: true,
					Units: true,
					Amounts: true,
					Comments: true,
					Comments_Custom_1: true,
				},
				orderBy: { createdAt: "asc" },
			}),
		]);
		return {
			start,
			today: plannerToday(),
			plans: plans.map(serialize),
			options: {
				works: options.productivity.works.map((row) => ({
					work: row.work,
					unit: row.unit,
				})),
				locations: options.locations,
				units: options.units,
			},
			actuals: actuals.flatMap((row) => {
				if (!row.Date) return [];
				const date = plannerToday(row.Date);
				if (date < start || date >= end) return [];
				const comparison = getDefaultConstructionQuantityComparison(
					row,
					config,
				);
				return {
					id: row.id,
					date,
					work: row.Works ?? "",
					location: row.Location ?? "",
					unit: row.Units ?? "",
					quantity: comparison.enabled ? comparison.actualAmount : row.Amounts,
					comments: row.Comments ?? "",
				};
			}),
		};
	} catch (error) {
		throw new Error(failure(error));
	}
}

export async function loadConstructionDiaryPlans(siteId: string) {
	const { site } = await authorize(siteId);
	try {
		const plans = (
			await prisma.constructionPlan.findMany({
				where: { siteId },
				orderBy: [{ date: "desc" }, { createdAt: "asc" }],
			})
		).map(serialize);
		const dates = new Set(plans.map((plan) => plan.date));
		const actuals = dates.size
			? await prisma.sitediaryrecords.findMany({
					where: {
						siteId,
						archivedAt: null,
						OR: Array.from(dates, (date) => ({
							Date: {
								gte: new Date(addDays(date, -1)),
								lt: new Date(addDays(date, 1)),
							},
						})),
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
					orderBy: [{ createdAt: "desc" }, { id: "asc" }],
				})
			: [];
		const config = configMap(site.siteDiaryRecordsMap);
		return comparePlans(
			plans,
			actuals.flatMap((row) => {
				if (!row.Date) return [];
				const date = plannerToday(row.Date);
				if (!dates.has(date)) return [];
				const quantity = getDefaultConstructionQuantityComparison(row, config);
				return [
					{
						id: row.id,
						date,
						work: row.Works ?? "",
						location: row.Location ?? "",
						unit: row.Units ?? "",
						quantity: quantity.enabled ? quantity.actualAmount : row.Amounts,
						comments: "",
					},
				];
			}),
			plannerToday(),
		).filter((row) => row.plan !== null);
	} catch (error) {
		throw new Error(failure(error));
	}
}

export async function saveConstructionPlan(input: unknown) {
	try {
		const draft = planSchema.parse(input);
		if (draft.id && !draft.version)
			throw new Error("Trūkst plāna versijas. Atjaunojiet sarakstu.");
		const { site, userId } = await authorize(draft.siteId);
		assertFuture(draft.date, plannerToday());
		const plan = await prisma.$transaction(async (tx) => {
			const today = plannerToday();
			assertFuture(draft.date, today);
			const currentSite = await tx.site.findFirst({
				where: { id: site.id, organizationId: site.organizationId },
				select: { siteDiaryRecordsMap: true, updatedAt: true },
			});
			if (!currentSite) throw new Error("Nav piekļuves.");
			const config = configMap(currentSite.siteDiaryRecordsMap);
			const options = getDefaultConstructionOptionValues(config);
			const canonical = (value: string, existing: string[]) =>
				existing.find(
					(option) => normalizePlanText(option) === normalizePlanText(value),
				) ?? value;
			const work = canonical(
				draft.work,
				options.productivity.works.map((row) => row.work),
			);
			const location = canonical(draft.location, options.locations);
			const unit = canonical(draft.unit, options.units);
			setDefaultConstructionWorkDropdownOptions(config, [
				...options.productivity.works.map((row) => row.work),
				work,
			]);
			if (!options.productivity.works.some((row) => row.work === work)) {
				const other = (config.otherSettings ?? {}) as Prisma.JsonObject;
				const settings = (other[
					DEFAULT_CONSTRUCTION_PRODUCTIVITY_SETTINGS_KEY
				] ?? { version: 4 }) as Prisma.JsonObject;
				config.otherSettings = {
					...other,
					[DEFAULT_CONSTRUCTION_PRODUCTIVITY_SETTINGS_KEY]: {
						...settings,
						works: [
							...(Array.isArray(settings.works) ? settings.works : []),
							{
								work,
								unit,
								laborNormHoursPerUnit: null,
								hourlyCost: null,
								costCalculationMode: "output",
							},
						],
					},
				};
			}
			for (const [field, values] of [
				["Location", [...options.locations, location]],
				["Units", [...options.units, unit]],
			] as const) {
				config[field] = {
					...(config[field] as Prisma.JsonObject),
					DropDownOptions: Object.fromEntries(
						Array.from(new Set(values)).map((value) => [value, value]),
					),
				};
			}
			const updatedSite = await tx.site.updateMany({
				where: {
					id: site.id,
					organizationId: site.organizationId,
					updatedAt: currentSite.updatedAt,
				},
				data: { siteDiaryRecordsMap: config },
			});
			if (updatedSite.count !== 1)
				throw new Error("Iestatījumi mainīti citā logā. Atjaunojiet plānu.");
			const data = {
				date: new Date(draft.date),
				work,
				location,
				unit,
				quantity: draft.quantity,
				matchKey: planMatchKey(work, location, unit),
				updatedBy: userId,
			};
			if (!draft.id)
				return tx.constructionPlan.create({
					data: { ...data, siteId: site.id, createdBy: userId },
				});
			const changed = await tx.constructionPlan.updateMany({
				where: {
					id: draft.id,
					siteId: site.id,
					version: draft.version,
					date: { gt: new Date(today) },
				},
				data: { ...data, version: { increment: 1 } },
			});
			if (changed.count !== 1)
				throw new Error(
					"Plāns ir bloķēts vai mainīts citā logā. Atjaunojiet sarakstu.",
				);
			return tx.constructionPlan.findUniqueOrThrow({ where: { id: draft.id } });
		});
		invalidate(site.id);
		return { ok: true as const, plan: serialize(plan) };
	} catch (error) {
		return { ok: false as const, error: failure(error) };
	}
}

export async function deleteConstructionPlan(input: unknown) {
	try {
		const draft = z
			.object({
				siteId: z.string().uuid(),
				id: z.string().uuid(),
				version: z.number().int().positive(),
			})
			.strict()
			.parse(input);
		const { site } = await authorize(draft.siteId);
		const deleted = await prisma.constructionPlan.deleteMany({
			where: {
				site: { organizationId: site.organizationId },
				id: draft.id,
				siteId: draft.siteId,
				version: draft.version,
				date: { gt: new Date(plannerToday()) },
			},
		});
		if (deleted.count !== 1)
			throw new Error(
				"Plāns ir bloķēts vai mainīts citā logā. Atjaunojiet sarakstu.",
			);
		invalidate(draft.siteId);
		return { ok: true as const };
	} catch (error) {
		return { ok: false as const, error: failure(error) };
	}
}
