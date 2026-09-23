import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";
import {
	type RecoveryPhoto,
	type RecoveryRecord,
	recoverDiaryPhotoLinks,
} from "../flows/default-construction/lib/diary-photo-recovery";
import { LIMENI_ORGANIZATION_ID } from "../flows/default-construction/lib/diary-photos";

async function main() {
	const apply = process.argv.includes("--apply");
	const client = new Client({
		connectionString: process.env.DATABASE_URL,
		connectionTimeoutMillis: 10000,
		statement_timeout: 20000,
	});
	await client.connect();
	try {
		await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
		const photos = (
			await client.query<RecoveryPhoto>(
				'SELECT id,"organizationId","siteId","userId","Date","URL","fileUrl","Comment","mediaPurpose" FROM photos WHERE "organizationId"=$1',
				[LIMENI_ORGANIZATION_ID],
			)
		).rows;
		const records = (
			await client.query<RecoveryRecord>(
				'SELECT id,"organizationId","siteId","userId","Date","originalUserComment","Photos","saveBatchId" FROM sitediaryrecords WHERE "organizationId"=$1 AND "archivedAt" IS NULL',
				[LIMENI_ORGANIZATION_ID],
			)
		).rows;
		const plan = recoverDiaryPhotoLinks(photos, records);
		const changes = records.flatMap((record) => {
			const links = plan.links.filter((link) => link.recordId === record.id);
			return links.length
				? [
						{
							id: record.id,
							siteId: record.siteId,
							before: record.Photos,
							after: [
								...new Set([
									...(record.Photos ?? []),
									...links.map((link) => link.url),
								]),
							],
							evidence: links,
						},
					]
				: [];
		});
		const reportPath = resolve(
			"../output/limeni-photo-link-recovery",
			`${Date.now()}-${apply ? "apply" : "preview"}.json`,
		);
		await mkdir(resolve(reportPath, ".."), { recursive: true });
		await writeFile(
			reportPath,
			JSON.stringify(
				{
					organizationId: LIMENI_ORGANIZATION_ID,
					mode: apply ? "apply-planned" : "preview",
					changes,
					unresolved: plan.unresolved,
				},
				null,
				2,
			),
			{ flag: "wx" },
		);
		if (apply) {
			for (const change of changes) {
				const result = await client.query(
					'UPDATE sitediaryrecords SET "Photos"=$1::text[] WHERE id=$2 AND "siteId"=$3 AND "organizationId"=$4 AND "archivedAt" IS NULL AND "Photos" IS NOT DISTINCT FROM $5::text[]',
					[
						change.after,
						change.id,
						change.siteId,
						LIMENI_ORGANIZATION_ID,
						change.before,
					],
				);
				if (result.rowCount !== 1)
					throw new Error(`Record changed during recovery: ${change.id}`);
			}
			await client.query("COMMIT");
		} else await client.query("ROLLBACK");
		console.log(
			JSON.stringify(
				{
					applied: apply,
					records: changes.length,
					links: plan.links.length,
					photos: new Set(plan.links.map((link) => link.photoId)).size,
					unresolved: plan.unresolved.length,
					reportPath,
					evidence: plan.links.map(({ recordId, photoId, evidence }) => ({
						recordId,
						photoId,
						evidence,
					})),
				},
				null,
				2,
			),
		);
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		await client.end();
	}
}

main().catch((error) => {
	console.error(error.message);
	process.exitCode = 1;
});
