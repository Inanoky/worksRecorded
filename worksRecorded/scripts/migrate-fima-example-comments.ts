import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { Client } from "pg";
import { migrateFimaExampleComments } from "../lib/fima/bis-examples";

type Row = { id: string; siteId: string; evalMetadata: unknown };

async function main() {
	const args = process.argv.slice(2);
	const organizationId = args
		.find((arg) => arg.startsWith("--organization="))
		?.slice("--organization=".length);
	const backup = args
		.find((arg) => arg.startsWith("--backup="))
		?.slice("--backup=".length);
	const apply = args.includes("--apply");
	if (!organizationId || (apply && !backup))
		throw new Error(
			"Specify --organization=<id> and, for --apply, --backup=<file>.",
		);
	const db = new Client({
		connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
		connectionTimeoutMillis: 15000,
		query_timeout: 30000,
	});
	await db.connect();
	try {
		await db.query("BEGIN");
		const result = await db.query<Row>(
			`SELECT r.id,r."siteId",r."evalMetadata" FROM "sitediaryrecords" r JOIN "Site" s ON s.id=r."siteId" WHERE r."organizationId"=$1 AND s."organizationId"=$1 AND s."siteDiaryRecordsMap" #>> '{otherSettings,fimaCollaboration}'='true' AND r."archivedAt" IS NULL FOR UPDATE OF r`,
			[organizationId],
		);
		const changes = result.rows.flatMap((row) => {
			const next = migrateFimaExampleComments(row.evalMetadata);
			return next.moved
				? [{ ...row, next: next.metadata, moved: next.moved }]
				: [];
		});
		if (apply && changes.length) {
			if (!backup) throw new Error("A backup file is required.");
			await mkdir(path.dirname(path.resolve(backup)), { recursive: true });
			await writeFile(
				backup,
				JSON.stringify(
					{
						organizationId,
						at: new Date().toISOString(),
						records: changes.map(({ next, moved, ...row }) => row),
					},
					null,
					2,
				),
				{ flag: "wx" },
			);
			for (const row of changes) {
				const updated = await db.query(
					`UPDATE "sitediaryrecords" SET "evalMetadata"=$1::jsonb WHERE id=$2 AND "siteId"=$3 AND "organizationId"=$4 AND "archivedAt" IS NULL RETURNING "evalMetadata"`,
					[JSON.stringify(row.next), row.id, row.siteId, organizationId],
				);
				if (
					updated.rowCount !== 1 ||
					!isDeepStrictEqual(updated.rows[0].evalMetadata, row.next)
				)
					throw new Error(`Failed to verify migrated record ${row.id}`);
			}
		}
		await db.query(apply ? "COMMIT" : "ROLLBACK");
		console.log(
			JSON.stringify({
				applied: apply,
				records: changes.length,
				commentsMoved: changes.reduce((sum, row) => sum + row.moved, 0),
			}),
		);
	} catch (error) {
		await db.query("ROLLBACK");
		throw error;
	} finally {
		await db.end();
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : "Migration failed");
	process.exitCode = 1;
});
