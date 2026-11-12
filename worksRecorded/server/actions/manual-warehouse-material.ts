"use server";

import { revalidatePath } from "next/cache";
import { requireConstructionProjectAccess } from "@/flows/default-construction/backend/construction-project-access";
import { bisActionResult } from "@/lib/bis/action-result";
import {
	type ManualMaterialInput,
	manualMaterialSchema,
} from "@/lib/bis/manual-material";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

export async function createManualWarehouseMaterial(
	input: ManualMaterialInput,
) {
	const parsed = manualMaterialSchema.safeParse(input);
	if (!parsed.success)
		throw new Error(
			parsed.error.issues[0]?.message || "Pārbaudiet ievadītos datus.",
		);
	const value = parsed.data;
	const user = await requireUser();
	const access = await requireConstructionProjectAccess(user.id, value.siteId);
	const { materialDate, invoiceDate, ...fields } = value;
	const data = {
		...fields,
		userId: user.id,
		orgId: access.organizationId,
		materialDate: new Date(`${materialDate}T00:00:00Z`),
		invoiceDate: invoiceDate ? new Date(`${invoiceDate}T00:00:00Z`) : null,
	};
	const result = await prisma.bISmaterialRecords.createMany({
		data: [data],
		skipDuplicates: true,
	});
	if (result.count === 0) {
		const existing = await prisma.bISmaterialRecords.findUnique({
			where: { id: value.id },
		});
		if (
			!existing ||
			Object.entries(data).some(([key, next]) => {
				const old = existing[key as keyof typeof existing];
				return next instanceof Date
					? !(old instanceof Date) || next.getTime() !== old.getTime()
					: next !== old;
			})
		)
			throw new Error(
				"Šis pieprasījums jau izmantots citiem datiem. Atveriet materiāla pievienošanu no jauna.",
			);
	}
	revalidatePath(`/dashboard/sites/${value.siteId}/BIS`);
	return { id: value.id };
}

export async function saveManualWarehouseMaterial(input: ManualMaterialInput) {
	return bisActionResult(() => createManualWarehouseMaterial(input));
}
