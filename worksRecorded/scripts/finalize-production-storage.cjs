require("dotenv/config");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { Client } = require("pg");

async function main() {
	const apply = process.argv.includes("--apply");
	if (apply && !process.argv.includes("--confirm-new-code-deployed")) {
		throw new Error(
			"Verify the new deployment and stop old workers before using --apply --confirm-new-code-deployed.",
		);
	}
	const client = new Client({
		connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
	});
	await client.connect();
	try {
		await client.query("BEGIN");
		await client.query("SET LOCAL lock_timeout = '3s'");
		await client.query("SET LOCAL statement_timeout = '30s'");
		await client.query(
			readFileSync(join(__dirname, "finalize-production-storage.sql"), "utf8"),
		);
		await client.query(apply ? "COMMIT" : "ROLLBACK");
		console.log(
			apply
				? "Storage bridge removed; legacy copies retained."
				: "Cutover checks passed; rolled back without changes.",
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
