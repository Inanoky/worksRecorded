import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/db";

export function loadZtcSiteConfiguration(siteId: string) {
	return prisma.ztcSiteConfiguration.findUnique({ where: { siteId } });
}

export function saveZtcSiteConfiguration(
	siteId: string,
	siteDiaryRecordsMap: Prisma.InputJsonValue,
) {
	return prisma.ztcSiteConfiguration.upsert({
		where: { siteId },
		create: { siteId, siteDiaryRecordsMap },
		update: { siteDiaryRecordsMap },
	});
}
