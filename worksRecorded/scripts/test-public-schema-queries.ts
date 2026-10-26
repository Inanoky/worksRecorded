import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { Client } from "pg";
import ts from "typescript";

function rawQueries(path: string) {
	const source = ts.createSourceFile(
		path,
		readFileSync(path, "utf8"),
		ts.ScriptTarget.Latest,
		true,
	);
	const queries: string[] = [];
	const visit = (node: ts.Node) => {
		if (
			ts.isTaggedTemplateExpression(node) &&
			/\$(executeRaw|queryRaw)$/.test(node.tag.getText(source))
		) {
			const template = node.template;
			queries.push(
				ts.isNoSubstitutionTemplateLiteral(template)
					? template.text
					: template.head.text +
							template.templateSpans
								.map((span, index) => `$${index + 1}${span.literal.text}`)
								.join(""),
			);
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return queries;
}

async function main() {
	assert.equal(process.env.RUN_ZTC_BATCH_DB_TESTS, "true");
	config({ quiet: true });
	const cases = [
		{
			path: "flows/ztc-production/backend/message-recovery.ts",
			values: [
				["pending_review", "{}", "fixture-worker", ["fixture-message"]],
				["{}", "fixture-worker", "fixture-message"],
				["[]", "fixture-worker", ["fixture-message"]],
			],
		},
		{
			path: "server/actions/fima-diary-collaboration.ts",
			values: [
				["fixture-record", "fixture-site", "fixture-organization"],
				["{}", "fixture-record", "fixture-site", "fixture-organization"],
			],
		},
	];
	const db = new Client({
		connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
	});
	await db.connect();
	try {
		await db.query("BEGIN READ ONLY");
		await db.query("SET LOCAL search_path = ''");
		for (const test of cases) {
			const queries = rawQueries(test.path);
			assert.equal(queries.length, test.values.length);
			for (const [index, query] of queries.entries()) {
				await db.query(`EXPLAIN ${query}`, test.values[index]);
			}
		}
		console.log(
			"Passed: ZTC retention, failure-status and media updates, plus FIMA locked reads and updates resolve with an empty search_path. EXPLAIN only; no data mutations.",
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
