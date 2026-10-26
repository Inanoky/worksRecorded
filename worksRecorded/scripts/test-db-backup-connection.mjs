import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const bash =
	process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";
const script = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../.github/scripts/db-backup.sh",
);
const bashPath = (value) =>
	value
		.replaceAll("\\", "/")
		.replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);

for (const port of ["6543", "5432"]) {
	const directory = mkdtempSync(path.join(tmpdir(), "works-recorded-backup-"));
	writeFileSync(
		path.join(directory, "docker"),
		`#!/usr/bin/env bash
printf '%s\\n' "$@" > docker-arguments.txt
printf '%s' "$PGPORT" > docker-port.txt
file="\${!#}"
printf 'verified mock dump\\n' > "backups/\${file##*/}"
`,
		{ mode: 0o755 },
	);
	const result = spawnSync(
		bash,
		[
			"-c",
			'export PATH="$1:$PATH"; bash "$2"',
			"--",
			bashPath(directory),
			bashPath(script),
		],
		{
			cwd: directory,
			encoding: "utf8",
			env: {
				...process.env,
				PGPORT: port,
				PGHOST: "example.pooler.supabase.com",
				PGUSER: "test-user",
				PGDATABASE: "test-db",
				PGPASSWORD: "test-password-not-in-arguments",
			},
		},
	);
	if (result.error) throw result.error;
	if (port === "6543") {
		assert.notEqual(result.status, 0);
		assert.match(result.stderr, /direct or session connection/);
		assert.equal(
			existsSync(path.join(directory, "docker-arguments.txt")),
			false,
		);
	} else {
		assert.equal(result.status, 0, result.stderr);
		const argumentsText = readFileSync(
			path.join(directory, "docker-arguments.txt"),
			"utf8",
		);
		assert.match(argumentsText, /--env\nPGPASSWORD/);
		assert.doesNotMatch(argumentsText, /test-password-not-in-arguments/);
		assert.equal(
			readFileSync(path.join(directory, "docker-port.txt"), "utf8"),
			"5432",
		);
	}
}

console.log(
	"Passed: transaction-pool backups rejected, session backups accepted, credentials excluded from Docker arguments.",
);
