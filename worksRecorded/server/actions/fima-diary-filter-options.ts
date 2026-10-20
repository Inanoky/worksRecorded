"use server";

import { z } from "zod";
import { buildFimaDiaryPageWhere } from "@/flows/default-construction/backend/fima-diary-page";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";

export async function getFimaDiaryFilterOptions(siteId: string) {
	z.string().uuid().parse(siteId);
	const user = await requireUser();
	const site = await orgCheck(user.id, siteId);
	if (!site || !site.organizationId)
		throw new Error("Nav piekļuves projektam.");
	const where = buildFimaDiaryPageWhere(site.organizationId, {
		projectId: siteId,
	});
	const [works, locations] = await Promise.all([
		prisma.sitediaryrecords.groupBy({ by: ["Works"], where }),
		prisma.sitediaryrecords.groupBy({ by: ["Location"], where }),
	]);
	const values = (items: (string | null)[]) =>
		Array.from(
			new Set(items.filter((item): item is string => Boolean(item?.trim()))),
		).sort((a, b) => a.localeCompare(b, "lv"));
	return {
		works: values(works.map((row) => row.Works)),
		locations: values(locations.map((row) => row.Location)),
	};
}
