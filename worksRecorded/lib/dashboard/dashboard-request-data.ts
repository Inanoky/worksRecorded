import { cache } from "react";
import { DEMO_ORGANIZATION_ID, DEMO_SITE_ID } from "@/flows/demo/constants";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { createPerfTrace } from "@/lib/observability/perf";
import { prisma } from "@/lib/utils/db";
import { isSuperUserId } from "@/lib/utils/super-user";

export const loadDashboardAccount = cache(async (userId: string) =>
	prisma.user.findUnique({
		where: { id: userId },
		select: {
			email: true,
			phone: true,
			userTour: true,
			organizationId: true,
			organization: {
				select: {
					name: true,
					orgLanguage: true,
				},
			},
		},
	}),
);

export const loadDashboardSites = cache(
	async (organizationId: string | null, isSuperUser: boolean, userId: string) =>
		prisma.site.findMany({
			where: isSuperUser
				? {}
				: {
						OR: [
							{ organizationId: organizationId ?? "" },
							{
								id: DEMO_SITE_ID,
								organizationId: DEMO_ORGANIZATION_ID,
								userId,
							},
						],
					},
			select: {
				id: true,
				name: true,
				description: true,
				imageUrl: true,
				organizationId: true,
				siteDiaryRecordsMap: true,
				bisCaseId: true,
			},
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		}),
);

export const loadDashboardFlowModuleKey = cache(
	async (organizationId: string | null, isSuperUser: boolean) =>
		isSuperUser ? null : resolveFlowModuleKeyForRuntime({ organizationId }),
);

export const loadDashboardRequestData = cache(async (userId: string) => {
	const trace = createPerfTrace({
		route: "dashboard-bootstrap",
		category: "action",
		userId,
	});
	try {
		const account = await trace.measure("account", () =>
			loadDashboardAccount(userId),
		);
		const isSuperUser = isSuperUserId(userId);
		const organizationId = isSuperUser
			? null
			: (account?.organizationId ?? null);
		const [sites, flowModuleKey] = await trace.measure("workspace", () =>
			Promise.all([
				loadDashboardSites(organizationId, isSuperUser, userId),
				loadDashboardFlowModuleKey(organizationId, isSuperUser),
			]),
		);
		trace.end({
			status: 200,
			extra: { siteCount: sites.length, isSuperUser },
		});
		return {
			account,
			flowModuleKey,
			isSuperUser,
			organizationId,
			sites,
		};
	} catch (error) {
		trace.fail(error, { status: 500 });
		throw error;
	}
});
