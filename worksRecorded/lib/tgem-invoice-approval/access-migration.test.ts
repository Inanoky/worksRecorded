import { readFileSync } from "node:fs";
import path from "node:path";

const migration = readFileSync(
	path.join(
		process.cwd(),
		"prisma/migrations/20261009120000_backfill_tgem_access_audit_events/migration.sql",
	),
	"utf8",
);

describe("TGEM access audit backfill migration", () => {
	it("backfills every access record type with a migration source", () => {
		expect(migration).toContain("'group_created'");
		expect(migration).toContain("'organization_membership_added'");
		expect(migration).toContain("'site_membership_added'");
		expect(migration).toContain("'migration_backfill'");
	});

	it("guards every insert against an existing audit event", () => {
		expect(migration.match(/WHERE NOT EXISTS/g)).toHaveLength(3);
		expect(migration.match(/ON CONFLICT \("id"\) DO NOTHING/g)).toHaveLength(3);
	});
});
