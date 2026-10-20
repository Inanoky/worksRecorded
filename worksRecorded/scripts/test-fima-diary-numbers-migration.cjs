const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require(process.argv[2] || "@electric-sql/pglite");

const migration = fs.readFileSync(
	path.resolve(
		__dirname,
		"../prisma/migrations/20261019120000_fima_diary_numbers/migration.sql",
	),
	"utf8",
);
const schema = `
CREATE TABLE "Site" (id TEXT PRIMARY KEY, "siteDiaryRecordsMap" JSONB);
CREATE TABLE "sitediaryrecords" (
  id TEXT PRIMARY KEY, "siteId" TEXT REFERENCES "Site"(id),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP, "Works" TEXT
);
INSERT INTO "Site" VALUES
('fima-a', '{"otherSettings":{"fimaCollaboration":true}}'),
('fima-b', '{"otherSettings":{"fimaCollaboration":true}}'),
('other', '{"otherSettings":{"fimaCollaboration":false}}');
`;

async function testBackfillAndAssignment() {
	const db = new PGlite();
	try {
		await db.exec(schema);
		await db.exec(`
      INSERT INTO "sitediaryrecords" (id, "siteId", "createdAt", "archivedAt", "Works") VALUES
      ('newer', 'fima-b', '2026-10-19', NULL, 'Keep this work'),
      ('older-b', 'fima-a', '2026-10-01', '2026-10-02', 'Archived'),
      ('older-a', 'fima-a', '2026-10-01', NULL, 'Original'),
      ('non-fima', 'other', '2026-09-01', NULL, 'Other flow');
    `);
		await db.exec(migration);
		const rows = await db.query(
			'SELECT id, "fimaNumber", "Works" FROM "sitediaryrecords" ORDER BY id',
		);
		assert.deepEqual(rows.rows, [
			{ id: "newer", fimaNumber: 3, Works: "Keep this work" },
			{ id: "non-fima", fimaNumber: null, Works: "Other flow" },
			{ id: "older-a", fimaNumber: 1, Works: "Original" },
			{ id: "older-b", fimaNumber: 2, Works: "Archived" },
		]);
		await db.exec(
			`INSERT INTO "sitediaryrecords" (id, "siteId", "fimaNumber") VALUES ('copy', 'fima-b', 1), ('other-new', 'other', 999)`,
		);
		const copy = await db.query(
			`SELECT "fimaNumber" FROM "sitediaryrecords" WHERE id = 'copy'`,
		);
		assert.equal(copy.rows[0].fimaNumber, 4);
		await db.exec(
			`UPDATE "sitediaryrecords" SET "fimaNumber" = 999, "Works" = 'Edited', "siteId" = 'fima-b' WHERE id = 'older-a'`,
		);
		await db.exec(
			`UPDATE "sitediaryrecords" SET "fimaNumber" = NULL WHERE id = 'older-a'`,
		);
		const unchanged = await db.query(
			`SELECT "fimaNumber", "Works" FROM "sitediaryrecords" WHERE id = 'older-a'`,
		);
		assert.deepEqual(unchanged.rows[0], { fimaNumber: 1, Works: "Edited" });
		await db.exec(`DELETE FROM "sitediaryrecords" WHERE id = 'copy'`);
		const inserted = await Promise.all(
			Array.from({ length: 20 }, (_, index) =>
				db.query(
					'INSERT INTO "sitediaryrecords" (id, "siteId") VALUES ($1, $2) RETURNING "fimaNumber"',
					[`batch-${index}`, index % 2 ? "fima-a" : "fima-b"],
				),
			),
		);
		const assigned = inserted.map((result) => result.rows[0].fimaNumber);
		assert.equal(new Set(assigned).size, 20);
		assert(assigned.every((number) => number > 4));
		const other = await db.query(
			`SELECT "fimaNumber" FROM "sitediaryrecords" WHERE "siteId" = 'other'`,
		);
		assert(other.rows.every((row) => row.fimaNumber === null));
		await db.exec(
			`UPDATE "Site" SET "siteDiaryRecordsMap" = '{"otherSettings":{"fimaCollaboration":true}}' WHERE id = 'other'`,
		);
		const enabled = await db.query(
			`SELECT "fimaNumber" FROM "sitediaryrecords" WHERE "siteId" = 'other'`,
		);
		assert.equal(enabled.rows.length, 2);
		assert(enabled.rows.every((row) => row.fimaNumber > 24));
		const before = await db.query(
			'SELECT id, "fimaNumber" FROM "sitediaryrecords" ORDER BY id',
		);
		await db.exec(
			`UPDATE "Site" SET "siteDiaryRecordsMap" = '{"otherSettings":{"fimaCollaboration":false}}' WHERE id = 'other'; UPDATE "Site" SET "siteDiaryRecordsMap" = '{"otherSettings":{"fimaCollaboration":true}}' WHERE id = 'other'`,
		);
		assert.deepEqual(
			(
				await db.query(
					'SELECT id, "fimaNumber" FROM "sitediaryrecords" ORDER BY id',
				)
			).rows,
			before.rows,
		);
	} finally {
		await db.close();
	}
}

async function testEmptyBackfill() {
	const db = new PGlite();
	try {
		await db.exec(schema);
		await db.exec(migration);
		const result = await db.query(
			`INSERT INTO "sitediaryrecords" (id, "siteId") VALUES ('first', 'fima-a') RETURNING "fimaNumber"`,
		);
		assert.equal(result.rows[0].fimaNumber, 1);
	} finally {
		await db.close();
	}
}

(async () => {
	await testBackfillAndAssignment();
	await testEmptyBackfill();
	console.log(
		"FIMA numbering migration passed in isolated PostgreSQL: backfill, copies, immutable numbers, batch uniqueness, deletion gaps, flow isolation, flow enablement, empty backfill.",
	);
})().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
