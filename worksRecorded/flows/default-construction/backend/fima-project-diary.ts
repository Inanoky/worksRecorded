import { buildDefaultConstructionDiaryConfig } from "@/flows/default-construction/lib/diary-config";
import type { FimaProjectDiary } from "@/lib/fima/project-diary";
import { createPerfTrace } from "@/lib/observability/perf";
import { prisma } from "@/lib/utils/db";
import { loadFimaDiaryPage } from "./fima-diary-page";

export async function loadFimaProjectDiary(
	organizationId: string,
	siteId: string,
): Promise<FimaProjectDiary | null> {
	const trace = createPerfTrace({
		route: "dashboard.fima.initialDiary",
		category: "action",
		siteId,
	});
	try {
		const site = await trace.measure("config", () =>
			prisma.site.findFirst({
				where: {
					id: siteId,
					organizationId,
					siteDiaryRecordsMap: {
						path: ["otherSettings", "fimaCollaboration"],
						equals: true,
					},
				},
				select: {
					siteDiaryRecordsMap: true,
					organizationId: true,
					bisCaseNumber: true,
					bisCaseId: true,
				},
			}),
		);
		if (!site) {
			trace.end({ status: 200, extra: { fima: false } });
			return null;
		}
		const config = buildDefaultConstructionDiaryConfig(site);
		const page = await trace.measure("records", () =>
			loadFimaDiaryPage(organizationId, {
				projectId: siteId,
				projectView: true,
				page: 1,
			}),
		);
		trace.end({ status: 200, extra: { returnedCount: page.rows.length } });
		return { siteId, config, page: page as FimaProjectDiary["page"] };
	} catch (error) {
		trace.fail(error, { status: 500 });
		throw error;
	}
}
