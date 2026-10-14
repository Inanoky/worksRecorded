import { z } from "zod";
import { prisma } from "@/lib/utils/db";
import { requireVisualAccess } from "./store";

const contactNameSchema = z.string().trim().min(2).max(100);
const contactPhoneSchema = z
	.string()
	.transform((value) => value.replace(/\D/g, ""))
	.pipe(z.string().regex(/^\d{8,15}$/));

export const visualPlanningContactInputSchema = z
	.object({
		siteId: z.string().uuid(),
		id: z.string().uuid().optional(),
		name: contactNameSchema,
		phone: contactPhoneSchema,
	})
	.strict();

const visualPlanningContactMutationSchema = z
	.object({
		siteId: z.string().uuid(),
		id: z.string().uuid(),
	})
	.strict();

type StoredVisualPlanningContact = {
	id: string;
	name: string;
	phone: string;
	archivedAt: Date | null;
};

export type VisualPlanningContact = ReturnType<
	typeof serializeVisualPlanningContact
>;

export function serializeVisualPlanningContact(
	row: StoredVisualPlanningContact,
) {
	return {
		id: row.id,
		name: row.name,
		phone: row.phone,
		archivedAt: row.archivedAt?.toISOString() ?? null,
	};
}

export async function listVisualPlanningContacts(
	userId: string,
	siteId: string,
) {
	await requireVisualAccess(userId, siteId);
	const rows = await prisma.visualPlanningContact.findMany({
		where: { siteId },
		orderBy: [{ archivedAt: "asc" }, { name: "asc" }, { id: "asc" }],
	});
	return rows.map(serializeVisualPlanningContact);
}

export async function persistVisualPlanningContact(
	userId: string,
	rawInput: unknown,
) {
	const input = visualPlanningContactInputSchema.parse(rawInput);
	await requireVisualAccess(userId, input.siteId);
	const duplicate = await prisma.visualPlanningContact.findFirst({
		where: {
			siteId: input.siteId,
			phone: input.phone,
			...(input.id ? { id: { not: input.id } } : {}),
		},
		select: { id: true },
	});
	if (duplicate)
		throw new Error("Šis tālruņa numurs jau ir saglabāts adrešu grāmatā.");

	if (!input.id) {
		const created = await prisma.visualPlanningContact.create({
			data: {
				siteId: input.siteId,
				name: input.name,
				phone: input.phone,
			},
		});
		return serializeVisualPlanningContact(created);
	}

	const changed = await prisma.visualPlanningContact.updateMany({
		where: {
			id: input.id,
			siteId: input.siteId,
			archivedAt: null,
		},
		data: { name: input.name, phone: input.phone },
	});
	if (changed.count !== 1)
		throw new Error("Kontakts nav atrasts vai jau ir arhivēts.");
	const saved = await prisma.visualPlanningContact.findUniqueOrThrow({
		where: { id: input.id },
	});
	return serializeVisualPlanningContact(saved);
}

export async function archiveVisualPlanningContact(
	userId: string,
	rawInput: unknown,
) {
	const input = visualPlanningContactMutationSchema.parse(rawInput);
	await requireVisualAccess(userId, input.siteId);
	const changed = await prisma.visualPlanningContact.updateMany({
		where: { id: input.id, siteId: input.siteId, archivedAt: null },
		data: { archivedAt: new Date() },
	});
	if (changed.count !== 1)
		throw new Error("Kontakts nav atrasts vai jau ir arhivēts.");
	const saved = await prisma.visualPlanningContact.findUniqueOrThrow({
		where: { id: input.id },
	});
	return serializeVisualPlanningContact(saved);
}

export async function restoreVisualPlanningContact(
	userId: string,
	rawInput: unknown,
) {
	const input = visualPlanningContactMutationSchema.parse(rawInput);
	await requireVisualAccess(userId, input.siteId);
	const changed = await prisma.visualPlanningContact.updateMany({
		where: { id: input.id, siteId: input.siteId, archivedAt: { not: null } },
		data: { archivedAt: null },
	});
	if (changed.count !== 1)
		throw new Error("Kontakts nav atrasts vai jau ir aktīvs.");
	const saved = await prisma.visualPlanningContact.findUniqueOrThrow({
		where: { id: input.id },
	});
	return serializeVisualPlanningContact(saved);
}
