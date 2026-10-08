import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
	LIMENI_ORGANIZATION_ID,
	normalizeDiaryPhotoUrls,
} from "../flows/default-construction/lib/diary-photos";
import {
	diaryPhotoRecordSelect,
	ensureDiaryPhotoAttachments,
} from "../lib/photos/diary-photo-attachments";

async function main() {
	const args = process.argv.slice(2);
	const siteId = args.find((arg) => arg.startsWith("--site="))?.slice(7);
	const apply = args.includes("--apply");
	if (
		!siteId ||
		args.some((arg) => !arg.startsWith("--site=") && arg !== "--apply")
	) {
		throw new Error(
			"Usage: npx tsx scripts/repair-diary-photo-attachments.ts --site=<siteId> [--apply]",
		);
	}
	const prisma = new PrismaClient();
	try {
		const site = await prisma.site.findFirst({
			where: { id: siteId, organizationId: LIMENI_ORGANIZATION_ID },
			select: { id: true },
		});
		if (!site) throw new Error("Limeni project not found");
		const where = {
			siteId,
			organizationId: LIMENI_ORGANIZATION_ID,
			archivedAt: null,
			Photos: { isEmpty: false },
		};
		const records = await prisma.sitediaryrecords.findMany({
			where,
			select: diaryPhotoRecordSelect,
			orderBy: [{ Date: "asc" }, { id: "asc" }],
		});
		const photos = await prisma.photos.findMany({
			where: {
				siteId,
				OR: [
					{ organizationId: LIMENI_ORGANIZATION_ID },
					{ organizationId: null },
				],
			},
		});
		const missing = records.flatMap((record) =>
			normalizeDiaryPhotoUrls(record.Photos).filter(
				(url) =>
					!photos.some(
						(photo) =>
							photo.diaryRecordId === record.id && photo.fileUrl === url,
					),
			),
		);
		console.log(
			JSON.stringify({
				mode: apply ? "apply" : "dry-run",
				siteId,
				records: records.length,
				missingAttachments: missing.length,
			}),
		);
		if (!apply || !missing.length) return;
		const directory = path.resolve(".site-diary-migrations");
		await mkdir(directory, { recursive: true });
		const backup = path.join(
			directory,
			`photo-ownership-${siteId}-${Date.now()}.json`,
		);
		await writeFile(
			backup,
			JSON.stringify({ siteId, records, photos }, null, 2),
			{ flag: "wx" },
		);
		await prisma.$transaction(
			async (tx) => {
				const current = await tx.sitediaryrecords.findMany({
					where,
					select: diaryPhotoRecordSelect,
					orderBy: [{ Date: "asc" }, { id: "asc" }],
				});
				if (JSON.stringify(current) !== JSON.stringify(records))
					throw new Error("Diary changed after backup; rerun the repair.");
				for (const record of current)
					await ensureDiaryPhotoAttachments(tx, record);
			},
			{ isolationLevel: "Serializable", timeout: 60000 },
		);
		console.log(JSON.stringify({ repaired: true, siteId, backup }));
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((error: unknown) => {
	console.error(
		error instanceof Error ? error.message : "Photo ownership repair failed",
	);
	process.exitCode = 1;
});
