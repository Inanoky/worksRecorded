"use server";

import { readMaterialConsumption } from "@/lib/material-consumption/store";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

export async function getMaterialConsumption() {
	const user = await requireUser();
	const account = await prisma.user.findUnique({
		where: { id: user.id },
		select: { organizationId: true, status: true },
	});
	if (
		!account?.organizationId ||
		(account.status !== null && account.status !== "active")
	)
		throw new Error("Materiālu pārskatam nav piekļuves.");
	return readMaterialConsumption(account.organizationId);
}
