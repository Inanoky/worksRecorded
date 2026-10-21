import "dotenv/config";
import { createHash } from "node:crypto";
import { LIMENI_ORGANIZATION_ID } from "@/flows/default-construction/lib/diary-photos";
import { VISUAL_DOCUMENT_TYPE } from "@/flows/default-construction/visual/model";
import { prepareVisualDrawingPreviews } from "@/flows/default-construction/visual/prepared-preview-store";
import { prisma } from "@/lib/utils/db";

async function run() {
	const siteId = process.argv
		.find((value) => value.startsWith("--site="))
		?.slice(7);
	if (!siteId)
		throw new Error("Pass --site=<siteId> and --apply to prepare previews");
	const where = {
		siteId,
		organizationId: LIMENI_ORGANIZATION_ID,
		documentType: VISUAL_DOCUMENT_TYPE,
	};
	const rows = await prisma.documents.findMany({
		where,
		orderBy: { id: "asc" },
	});
	const fingerprint = (items: typeof rows) =>
		createHash("sha256").update(JSON.stringify(items)).digest("hex");
	const before = fingerprint(rows);
	console.log(
		JSON.stringify({
			drawings: rows.length,
			apply: process.argv.includes("--apply"),
		}),
	);
	if (!process.argv.includes("--apply")) return;
	for (const row of rows) {
		const started = performance.now();
		const preview = await prepareVisualDrawingPreviews(row.id);
		console.log(
			JSON.stringify({
				drawingId: row.id,
				pages: preview.pages.length,
				milliseconds: Math.round(performance.now() - started),
			}),
		);
	}
	if (
		fingerprint(
			await prisma.documents.findMany({ where, orderBy: { id: "asc" } }),
		) !== before
	)
		throw new Error(
			"Drawing data changed during preparation; inspect before proceeding",
		);
	console.log("Original drawings and polygon state unchanged");
}

run()
	.catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
