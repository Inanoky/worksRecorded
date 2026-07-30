import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import {
	DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY,
	normalizeDefaultConstructionForma2State,
} from "../flows/default-construction/lib/forma2-analytics";
import { syncDefaultConstructionForma2WorkOptions } from "../flows/default-construction/lib/forma2-work-options-sync";

const prisma = new PrismaClient();

function argument(name: string) {
	const prefix = `--${name}=`;
	return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
	const siteId = argument("site");
	const apply = process.argv.includes("--apply");
	if (!siteId) throw new Error("Pass --site=<site-id>");

	const [site, analytics] = await Promise.all([
		prisma.site.findUnique({
			where: { id: siteId },
			select: { id: true, name: true, siteDiaryRecordsMap: true },
		}),
		prisma.analytics.findUnique({
			where: { siteId },
			select: { currentWeekProgress: true },
		}),
	]);
	if (!site) throw new Error("Site not found");
	const root =
		analytics?.currentWeekProgress &&
		typeof analytics.currentWeekProgress === "object" &&
		!Array.isArray(analytics.currentWeekProgress)
			? (analytics.currentWeekProgress as Record<string, unknown>)
			: {};
	const state = normalizeDefaultConstructionForma2State(
		root[DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY],
	);
	if (!state.document) throw new Error("Site has no imported Forma 2 document");
	const config =
		site.siteDiaryRecordsMap && typeof site.siteDiaryRecordsMap === "object"
			? (site.siteDiaryRecordsMap as Record<string, any>)
			: {};
	const result = syncDefaultConstructionForma2WorkOptions({
		config,
		documentId: state.document.id,
		positions: state.document.positions,
	});

	console.log(
		JSON.stringify(
			{
				mode: apply ? "apply" : "preview",
				siteId,
				siteName: site.name,
				document: state.document.fileName,
				importedWorks: result.importedWorks,
				addedWorks: result.addedWorks,
				removedWorks: result.removedWorks,
				linkedManualWorks: result.linkedManualWorks,
				darbiOptionsAfter: Object.values(
					result.config?.Works?.DropDownOptions ?? {},
				).length,
			},
			null,
			2,
		),
	);

	if (!apply) return;
	await prisma.site.update({
		where: { id: siteId },
		data: { siteDiaryRecordsMap: result.config as Prisma.InputJsonObject },
	});
}

main()
	.catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
