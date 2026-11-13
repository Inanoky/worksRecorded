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
import { isAreaUnit } from "./drawing-scale";
import { organizationPlanningContacts } from "./organization-contacts";
import { organizationContactReferenceSchema } from "./planning-contact-reference";
import { serializeVisualPlanningContact } from "./planning-contacts";
import {
	compareVisualPlanProgress,
	findVisualPlanConflict,
	VISUAL_PLAN_TYPE,
	type VisualPlan,
	type VisualPlanInput,
	visualPlanAreasSchema,
	visualPlanInputSchema,
} from "./planning-model";
import { sectionCatalogForProject } from "./section-catalog";
import { readVisualSections, sectionKey } from "./sections";
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
	visualPlanningContactId: string | null;
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

function whatsAppFailureReason(providerError: string | null) {
	if (!providerError) return "Meta piegāde neizdevās.";
	try {
		const errors = JSON.parse(providerError);
		if (Array.isArray(errors) && errors.some((error) => error?.code === 131047))
			return "Iepriekšējais sūtījums tika noraidīts ārpus 24 stundu sarakstes loga. Atkārtojiet sūtīšanu ar apstiprināto WhatsApp veidni.";
		if (Array.isArray(errors) && errors[0]?.code === 131042) {
			const details = String(
				errors[0]?.error_data?.details ?? "",
			).toLowerCase();
			if (details.includes("currency is not configured"))
				return "Meta kontam nav konfigurēta norēķinu valūta.";
			return "Meta maksājuma metode nav derīga vai nav aktivizēta.";
		}
	} catch {}
	return "Meta piegāde neizdevās.";
}

export function serializeVisualPlan(row: StoredVisualPlan): VisualPlan {
	if (!row.startDate) throw new Error("Vizuālajam plānam nav sākuma datuma.");
	const geometry = visualPlanAreasSchema.parse(row.visualAreas);
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
		contactId: geometry.organizationContact ?? row.visualPlanningContactId,
		geometry,
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
		select: { siteDiaryRecordsMap: true, name: true },
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
	const organizationContact = organizationContactReferenceSchema.safeParse(
		input.contactId,
	);
	if (organizationContact.success) {
		const contacts = await organizationPlanningContacts(organizationId);
		if (!contacts.some((contact) => contact.id === organizationContact.data))
			throw new Error(
				"Izvēlētais organizācijas kontakts nav pieejams vai tam nav derīga WhatsApp numura.",
			);
	} else if (input.contactId) {
		const contact = await prisma.visualPlanningContact.findFirst({
			where: { id: input.contactId, siteId: input.siteId },
			select: { archivedAt: true },
		});
		if (!contact)
			throw new Error("Izvēlētais kontakts šajā projektā nav atrasts.");
		if (contact.archivedAt) {
			const existingAssignment = input.id
				? await prisma.constructionPlan.findFirst({
						where: {
							id: input.id,
							siteId: input.siteId,
							visualPlanningContactId: input.contactId,
						},
						select: { id: true },
					})
				: null;
			if (!existingAssignment)
				throw new Error("Izvēlētais kontakts ir arhivēts.");
		}
	}
	const options = getDefaultConstructionOptionValues(
		(site.siteDiaryRecordsMap ?? {}) as Record<string, unknown>,
	);
	if (
		input.geometry.section &&
		!readVisualSections(
			(site.siteDiaryRecordsMap ?? {}) as Record<string, unknown>,
			site.name,
		).some(
			(item) => sectionKey(item) === sectionKey(input.geometry.section ?? ""),
		)
	)
		throw new Error("Izvēlieties projektā pieejamu sekciju.");
	const canonicalWork = ({
		work,
		unit,
	}: Pick<VisualPlanInput, "work" | "unit">) => {
		const setting = options.productivity.works.find(
			(option) => normalizePlanText(option.work) === normalizePlanText(work),
		);
		if (!setting) throw new Error("Izvēlieties projektā pieejamu darbu.");
		const canonicalUnit = setting.unit
			? canonicalOption(setting.unit, [unit]) && setting.unit
			: canonicalOption(unit, options.units);
		if (!canonicalUnit)
			throw new Error("Izvēlieties darbam projektā pieejamu mērvienību.");
		return { work: setting.work, unit: canonicalUnit };
	};
	const geometry = { ...input.geometry };
	delete geometry.organizationContact;
	delete geometry.mutationId;
	if (organizationContact.success)
		geometry.organizationContact = organizationContact.data;
	return {
		...input,
		geometry,
		...canonicalWork(input),
		additionalWorks: input.additionalWorks?.map((item) => ({
			clientId: item.clientId,
			...canonicalWork(item),
		})),
		config: (site.siteDiaryRecordsMap ?? {}) as Record<string, unknown>,
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

export async function loadVisualPlanningProjectData(
	siteId: string,
	organizationId: string,
) {
	const [
		site,
		rows,
		contactRows,
		organizationContacts,
		actualRows,
		whatsAppSends,
	] = await Promise.all([
		loadPlanningSite(prisma, siteId, organizationId),
		prisma.constructionPlan.findMany({
			where: { siteId, planType: VISUAL_PLAN_TYPE },
			orderBy: [{ archivedAt: "asc" }, { startDate: "asc" }, { date: "asc" }],
		}),
		prisma.visualPlanningContact.findMany({
			where: { siteId },
			orderBy: [{ archivedAt: "asc" }, { name: "asc" }, { id: "asc" }],
		}),
		organizationPlanningContacts(organizationId),
		prisma.sitediaryrecords.findMany({
			where: { siteId, organizationId, archivedAt: null },
			select: {
				id: true,
				Date: true,
				Works: true,
				Location: true,
				Units: true,
				Amounts: true,
				Comments_Custom_1: true,
			},
		}),
		prisma.whatsAppTaskSend.findMany({
			where: { siteId, organizationId },
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			include: { items: { orderBy: { ordinal: "asc" } } },
		}),
	]);
	return {
		site,
		contactRows,
		organizationContacts,
		actualRows,
		whatsAppSends,
		plans: (rows as unknown as StoredVisualPlan[]).map(serializeVisualPlan),
	};
}

export function visualPlansForLocation(
	location: string,
	data: Awaited<ReturnType<typeof loadVisualPlanningProjectData>>,
) {
	const { site, contactRows, organizationContacts, actualRows, whatsAppSends } =
		data;
	const plans = data.plans.filter(
		(plan) => normalizePlanText(plan.location) === normalizePlanText(location),
	);
	const options = getDefaultConstructionOptionValues(
		(site.siteDiaryRecordsMap ?? {}) as Record<string, unknown>,
	);
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
	const result = {
		today,
		...(sectionCatalogForProject(site.name).length
			? {
					sectionDrawingCodes: sectionCatalogForProject(site.name).map(
						(item) => item.code,
					),
				}
			: {}),
		location,
		workOptions: options.productivity.works.map((option) => ({
			work: option.work,
			unit: option.unit,
		})),
		unitOptions: options.units,
		contacts: [
			...organizationContacts,
			...contactRows
				.filter((contact) =>
					plans.some((plan) => plan.contactId === contact.id),
				)
				.map(serializeVisualPlanningContact),
		],
		plans: plans.map((plan) => ({
			...plan,
			progress: compareVisualPlanProgress(plan, actuals, today),
			whatsAppSends: whatsAppSends
				.filter((send) => send.planId === plan.id)
				.slice(0, 10)
				.map((send) => ({
					id: send.id,
					planVersion: send.planVersion,
					recipient: send.recipient,
					message: send.message,
					status: send.status,
					createdAt: send.createdAt.toISOString(),
					completedAt: send.completedAt?.toISOString() ?? null,
					items: send.items.map((item) => ({
						ordinal: item.ordinal,
						page: item.page,
						section: item.section,
						status: item.status,
						metaMessageId: item.metaMessageId,
						sentAt: item.sentAt?.toISOString() ?? null,
						deliveredAt: item.deliveredAt?.toISOString() ?? null,
						readAt: item.readAt?.toISOString() ?? null,
						failedAt: item.failedAt?.toISOString() ?? null,
						failureReason:
							item.status === "failed"
								? whatsAppFailureReason(item.providerError)
								: null,
					})),
				})),
		})),
	};
	return {
		...result,
		sections: readVisualSections(config, site.name),
	} as typeof result & { sections?: string[] };
}

export async function listVisualPlans(
	userId: string,
	siteId: string,
	drawingId: string,
) {
	const { row, drawing } = await loadVisualDrawing(userId, siteId, drawingId);
	if (!row.organizationId)
		throw new Error("Rasējuma organizācija nav atrasta.");
	return visualPlansForLocation(
		drawing.state.location,
		await loadVisualPlanningProjectData(siteId, row.organizationId),
	);
}

export async function persistVisualPlan(userId: string, rawInput: unknown) {
	const input = visualPlanInputSchema.parse(rawInput);
	const { row: drawingRow, drawing } = await loadVisualDrawing(
		userId,
		input.siteId,
		input.drawingId,
	);
	const organizationId = drawingRow.organizationId;
	if (!organizationId) throw new Error("Rasējuma organizācija nav atrasta.");
	const location = drawing.state.location;
	if (normalizePlanText(input.location) !== normalizePlanText(location))
		throw new Error("Plāna stāvs neatbilst izvēlētajam rasējumam.");
	const canonical = await canonicalizeInput(input, organizationId);
	const geometry = canonical.geometry;
	const sharedZoneId = geometry.sharedZoneId;
	const workItems = [
		{
			id: input.id ?? input.clientId,
			work: canonical.work,
			unit: canonical.unit,
		},
		...(canonical.additionalWorks ?? []).map(({ clientId, work, unit }) => ({
			id: clientId,
			work,
			unit,
		})),
	].map((item) => ({
		...item,
		matchKey: planMatchKey(item.work, location, item.unit),
	}));
	if (
		sharedZoneId &&
		(geometry.quantitySource !== "area" ||
			workItems.some((item) => !isAreaUnit(item.unit)))
	)
		throw new Error("Kopīgai zonai apjomu aprēķina no rasējuma laukuma (m²).");
	if (new Set(workItems.map((item) => item.matchKey)).size !== workItems.length)
		throw new Error("Katru darbu kopīgai zonai var izvēlēties vienreiz.");
	if (!input.id && sharedZoneId && !input.additionalWorks)
		throw new Error("Izvēlieties vismaz divus darbus kopīgai zonai.");

	const scope = { siteId: input.siteId, planType: VISUAL_PLAN_TYPE };
	const savedPlans = await prisma.$transaction(
		async (tx) => {
			for (const matchKey of workItems.map((item) => item.matchKey).sort())
				await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`visual-plan:${input.siteId}:${matchKey}`}))`;

			const planId = input.id ?? input.clientId;
			const previousRow =
				planId && (input.id || input.mutationId)
					? await tx.constructionPlan.findFirst({
							where: { ...scope, id: planId },
						})
					: null;
			const previous = previousRow ? serializeVisualPlan(previousRow) : null;
			if (input.id && previous?.geometry.sharedZoneId !== sharedZoneId)
				throw new Error(
					"Kopīgās zonas piesaiste ir mainīta. Atjaunojiet skatu.",
				);
			if (input.id && sharedZoneId && previous?.drawingId !== input.drawingId)
				throw new Error(
					"Kopīgā zona pieder citam rasējumam. Atjaunojiet skatu.",
				);
			if (
				sharedZoneId &&
				previous &&
				input.id &&
				previous.work !== canonical.work
			)
				throw new Error("Kopīgās zonas plānam nevar mainīt darba veidu.");

			const linkedRows =
				sharedZoneId && previous
					? await tx.constructionPlan.findMany({
							where: {
								...scope,
								id: { not: previous.id },
								visualDrawingId: input.drawingId,
								visualAreas: { path: ["sharedZoneId"], equals: sharedZoneId },
							},
						})
					: [];
			const linkedPlans = linkedRows.map(serializeVisualPlan);
			const inputAreas = JSON.stringify(geometry.areas);
			if (
				previous &&
				input.mutationId &&
				previous.geometry.mutationId === input.mutationId &&
				previous.drawingId === input.drawingId &&
				!previous.archivedAt &&
				previous.work === canonical.work &&
				previous.unit === canonical.unit &&
				previous.quantity === input.quantity &&
				previous.startDate === input.startDate &&
				previous.endDate === input.endDate &&
				previous.contactId === input.contactId &&
				JSON.stringify(previous.geometry.areas) === inputAreas &&
				(previous.geometry.section ?? null) === (geometry.section ?? null) &&
				(previous.geometry.notes ?? "") === (geometry.notes ?? "") &&
				previous.geometry.quantitySource === geometry.quantitySource &&
				previous.geometry.sharedZoneId === sharedZoneId &&
				(!canonical.additionalWorks ||
					canonical.additionalWorks.every((item) =>
						linkedPlans.some(
							(linked) =>
								linked.id === item.clientId &&
								linked.work === item.work &&
								linked.unit === item.unit &&
								linked.geometry.mutationId === input.mutationId,
						),
					))
			)
				return [previous, ...linkedPlans];
			if (previous && !input.id)
				throw new Error(
					"Plāns ar šo identifikatoru jau pastāv. Atjaunojiet skatu.",
				);

			const existing = (
				await tx.constructionPlan.findMany({
					where: {
						...scope,
						matchKey:
							workItems.length === 1
								? workItems[0].matchKey
								: { in: workItems.map((item) => item.matchKey) },
						archivedAt: null,
					},
				})
			).map(serializeVisualPlan);
			for (const item of workItems) {
				const conflict = findVisualPlanConflict(
					{
						id: item.id ?? "new",
						work: item.work,
						location,
						unit: item.unit,
						startDate: input.startDate,
						endDate: input.endDate,
					},
					existing,
				);
				if (conflict) throw new VisualPlanConflictError(conflict);
			}

			const commonData = {
				planType: VISUAL_PLAN_TYPE,
				startDate: new Date(input.startDate),
				date: new Date(input.endDate),
				location,
				quantity: input.quantity,
				visualDrawingId: input.drawingId,
				visualAreas: {
					...geometry,
					...(input.mutationId ? { mutationId: input.mutationId } : {}),
				},
				visualPlanningContactId: geometry.organizationContact
					? null
					: input.contactId,
				geometryReviewRequired: false,
				updatedBy: userId,
			};
			const saved: VisualPlan[] = [];
			for (const { id, work, unit, matchKey } of workItems) {
				const data = { ...commonData, work, unit, matchKey };
				let row: StoredVisualPlan;
				if (input.id) {
					if (!input.version)
						throw new Error("Trūkst plāna versijas. Atjaunojiet skatu.");
					row = await updatePlanningRow(
						tx,
						{
							...scope,
							id: input.id,
							version: input.version,
							archivedAt: null,
						},
						data,
					);
				} else {
					row = await tx.constructionPlan.create({
						data: {
							...data,
							...(id ? { id } : {}),
							siteId: input.siteId,
							createdBy: userId,
						},
					});
				}
				await createRevision(tx, row, input.id ? "update" : "create", userId);
				saved.push(serializeVisualPlan(row));
			}

			for (const linked of linkedPlans) {
				if (
					linked.quantity === input.quantity &&
					!linked.geometryReviewRequired &&
					JSON.stringify(linked.geometry.areas) === inputAreas
				)
					continue;
				const row = await updatePlanningRow(
					tx,
					{
						...scope,
						id: linked.id,
						version: linked.version,
					},
					{
						quantity: input.quantity,
						visualAreas: { ...linked.geometry, areas: geometry.areas },
						geometryReviewRequired: false,
						updatedBy: userId,
					},
				);
				await createRevision(tx, row, "update", userId);
				saved.push(serializeVisualPlan(row));
			}
			return saved;
		},
		{ isolationLevel: "Serializable" },
	);

	const rows = await prisma.sitediaryrecords.findMany({
		where: {
			siteId: input.siteId,
			organizationId,
			archivedAt: null,
			Date: {
				gte: new Date(
					addDays(savedPlans.map((plan) => plan.startDate).sort()[0], -1),
				),
			},
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
	});
	const actuals = rows.flatMap((row) => {
		if (!row.Date) return [];
		const quantity = getDefaultConstructionQuantityComparison(
			row,
			canonical.config,
		);
		return [
			{
				id: row.id,
				date: plannerToday(row.Date),
				work: row.Works ?? "",
				location: row.Location ?? "",
				unit: row.Units ?? "",
				quantity: quantity.enabled ? quantity.actualAmount : row.Amounts,
			},
		];
	});
	const today = plannerToday();
	const [plan, ...linkedPlans] = savedPlans.map((item) => ({
		...item,
		progress: compareVisualPlanProgress(item, actuals, today),
	}));
	return { plan, linkedPlans };
}

async function updatePlanningRow(
	tx: Prisma.TransactionClient,
	where: Prisma.ConstructionPlanWhereInput & { id: string },
	data: Prisma.ConstructionPlanUpdateManyMutationInput,
) {
	const updated = await tx.constructionPlan.updateMany({
		where,
		data: { ...data, version: { increment: 1 } },
	});
	if (updated.count !== 1)
		throw new Error("Plāns jau ir mainīts vai arhivēts. Atjaunojiet skatu.");
	return tx.constructionPlan.findUniqueOrThrow({ where: { id: where.id } });
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
