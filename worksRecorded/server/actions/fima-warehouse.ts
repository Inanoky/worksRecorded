"use server";

import { z } from "zod";
import { isFimaDiary } from "@/lib/fima/diary-collaboration";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { getBisCaseAvailableMaterials } from "@/server/actions/site-diary-actions";

const material = z.object({
	id: z.string(),
	label: z.string(),
	measurementUnit: z.string().nullable(),
	deliveredQuantity: z.number().finite(),
	usedQuantity: z.number().finite(),
	availableQuantity: z.number().finite().positive(),
});

export async function getFimaWarehouseAvailability(siteId: string) {
	z.string().uuid().parse(siteId);
	const user = await requireUser();
	const access = await orgCheck(user.id, siteId);
	if (!access) throw new Error("Nav piekļuves projektam.");
	const site = await prisma.site.findUnique({
		where: { id: siteId },
		select: { siteDiaryRecordsMap: true },
	});
	if (!isFimaDiary(site?.siteDiaryRecordsMap))
		throw new Error("Šis skats projektam nav pieejams.");
	return z.array(material).parse(await getBisCaseAvailableMaterials(siteId));
}
