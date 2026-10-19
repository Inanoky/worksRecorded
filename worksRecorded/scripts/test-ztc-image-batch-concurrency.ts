import assert from "node:assert/strict";
import { config } from "dotenv";
import { Client } from "pg";
import {
	buildZtcImageBatchDeleteQuery,
	buildZtcImageBatchStageQuery,
} from "../flows/ztc-production/backend/image-batch-queries";

async function main() {
	assert.equal(process.env.RUN_ZTC_BATCH_DB_TESTS, "true");
	config({ quiet: true });
	const db = new Client({ connectionString: process.env.DATABASE_URL });
	await db.connect();
	try {
		await db.query("BEGIN");
		await db.query("SET LOCAL search_path = pg_temp");
		await db.query(`CREATE TEMP TABLE "ZtcInboundMediaBatch" (
      id text PRIMARY KEY, "batchKey" text UNIQUE, "workerId" text,
      "organizationId" text, mode text, status text, items jsonb,
      "firstReceivedAt" timestamp, "lastReceivedAt" timestamp,
      "lastMessageId" text, "processAfter" timestamp,
      "createdAt" timestamp, "updatedAt" timestamp
    ) ON COMMIT DROP`);
		const stage = async (id: string, messageId: string) => {
			const query = buildZtcImageBatchStageQuery({
				id,
				messageId,
				batchKey: "ztc_worker:test-worker",
				workerId: "test-worker",
				organizationId: "test-org",
				mode: "ztc_worker",
				item: { messageId },
				quietMs: 5_000,
				staleMs: 120_000,
			});
			return (await db.query(query.text, query.values)).rows[0];
		};
		const remove = async (id: string) => {
			const query = buildZtcImageBatchDeleteQuery(id);
			return db.query(query.text, query.values);
		};
		const current = async () =>
			(await db.query('SELECT * FROM "ZtcInboundMediaBatch"')).rows[0];

		assert.equal((await stage("generation-a", "photo-a")).itemCount, 1);
		assert.equal((await stage("unused-id", "photo-b")).itemCount, 2);
		assert.equal((await current()).id, "generation-a");
		assert.equal((await remove("generation-a")).rowCount, 0);
		await db.query(
			`UPDATE "ZtcInboundMediaBatch" SET status='processing' WHERE id='generation-a'`,
		);

		assert.equal((await stage("generation-b", "photo-c")).itemCount, 1);
		assert.equal((await current()).id, "generation-b");
		assert.equal((await remove("generation-a")).rowCount, 0);
		assert.equal((await current()).items[0].messageId, "photo-c");

		await db.query(
			`UPDATE "ZtcInboundMediaBatch" SET status='processing' WHERE id='generation-b'`,
		);
		assert.equal((await remove("generation-b")).rowCount, 1);
		assert.equal(await current(), undefined);

		await stage("stale-generation", "stale-photo");
		await db.query(
			`UPDATE "ZtcInboundMediaBatch" SET "updatedAt"=NOW()-INTERVAL '3 minutes'`,
		);
		assert.equal((await stage("fresh-generation", "fresh-photo")).itemCount, 1);
		assert.equal((await current()).id, "fresh-generation");
		assert.equal((await remove("stale-generation")).rowCount, 0);
		console.log(
			"Passed: album aggregation, overlapping processing/arrival, guarded cleanup, and stale generation replacement. All operations used a temporary table and are rolled back.",
		);
	} finally {
		await db.query("ROLLBACK");
		await db.end();
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
