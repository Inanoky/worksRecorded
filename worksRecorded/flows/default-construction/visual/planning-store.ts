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
import { organizationPlanningContacts } from "./organization-contacts";
import { organizationContactReferenceSchema } from "./planning-contact-reference";
import { serializeVisualPlanningContact } from "./planning-contacts";
import {
	compareVisualPlanProgress,
	findVisualPlanConflict,
	VISUAL_PLAN_TYPE,
	type VisualPlan,
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
	const geometry = { ...input.geometry };
	delete geometry.organizationContact;
	if (organizationContact.success)
		geometry.organizationContact = organizationContact.data;
	return {
		...input,
		geometry,
		work: workSetting.work,
		unit: workSetting.unit || unit,
		workOptions: options.productivity.works.map((option) => ({
			work: option.work,
			unit: option.unit,
		})),
		unitOptions: options.units,
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
	if (!drawingRow.organizationId)
		throw new Error("Rasējuma organizācija nav atrasta.");
	if (
		normalizePlanText(input.location) !==
		normalizePlanText(drawing.state.location)
	)
		throw new Error("Plāna stāvs neatbilst izvēlētajam rasējumam.");
	const canonical = await canonicalizeInput(input, drawingRow.organizationId);
	const plan = await prisma.$transaction(
		async (tx) => {
			await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`visual-plan:${input.siteId}:${planMatchKey(canonical.work, drawing.state.location, canonical.unit)}`}))`;
			if (input.mutationId) {
				const previous = await tx.constructionPlan.findFirst({
					where: {
						id: input.id ?? input.clientId,
						siteId: input.siteId,
						planType: VISUAL_PLAN_TYPE,
					},
				});
				if (previous) {
					const saved = serializeVisualPlan(
						previous as unknown as StoredVisualPlan,
					);
					if (
						saved.geometry.mutationId === input.mutationId &&
						saved.drawingId === input.drawingId &&
						!saved.archivedAt &&
						saved.work === canonical.work &&
						saved.unit === canonical.unit &&
						saved.quantity === input.quantity &&
						saved.startDate === input.startDate &&
						saved.endDate === input.endDate &&
						saved.contactId === input.contactId &&
						JSON.stringify(saved.geometry.areas) ===
							JSON.stringify(canonical.geometry.areas) &&
						(saved.geometry.section ?? null) ===
							(canonical.geometry.section ?? null)
					)
						return saved;
					if (!input.id)
						throw new Error(
							"Plāns ar šo identifikatoru jau pastāv. Atjaunojiet skatu.",
						);
				}
			}
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
				id: input.id ?? input.clientId ?? "new",
				version: input.version ?? 1,
				drawingId: input.drawingId,
				work: canonical.work,
				location: drawing.state.location,
				unit: canonical.unit,
				quantity: input.quantity,
				startDate: input.startDate,
				endDate: input.endDate,
				contactId: input.contactId,
				geometry: canonical.geometry,
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
				visualAreas: {
					...canonical.geometry,
					...(input.mutationId ? { mutationId: input.mutationId } : {}),
				},
				visualPlanningContactId: organizationContactReferenceSchema.safeParse(
					input.contactId,
				).success
					? null
					: input.contactId,
				geometryReviewRequired: false,
				updatedBy: userId,
			};
			let saved: StoredVisualPlan;
			let action: "create" | "update";
			if (!input.id) {
				saved = (await tx.constructionPlan.create({
					data: {
						...data,
						...(input.clientId ? { id: input.clientId } : {}),
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
	const rows = await prisma.sitediaryrecords.findMany({
		where: {
			siteId: input.siteId,
			organizationId: drawingRow.organizationId,
			archivedAt: null,
			Date: { gte: new Date(addDays(plan.startDate, -1)) },
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
	return {
		...plan,
		progress: compareVisualPlanProgress(plan, actuals, plannerToday()),
	};
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
