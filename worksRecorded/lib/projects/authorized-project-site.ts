import "server-only";

import { prisma } from "@/lib/utils/db";
import { isSuperUserId } from "@/lib/utils/super-user";

export async function getAuthorizedProjectSite(userId: string, siteId: string) {
	return prisma.site.findFirst({
		where: isSuperUserId(userId)
			? { id: siteId }
			: {
					id: siteId,
					organization: {
						users: {
							some: { id: userId },
						},
					},
				},
		select: {
			id: true,
			name: true,
			organizationId: true,
			bisCaseId: true,
			bisCaseNumber: true,
			siteDiaryRecordsMap: true,
			organization: {
				select: { orgLanguage: true },
			},
		},
	});
}
