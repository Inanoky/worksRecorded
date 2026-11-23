if (
	!process.argv.some(
		(arg) => arg === "--project" || arg.startsWith("--project="),
	)
)
	process.argv.push("--project", "all");

import("./run-reviewed-diary-eval").catch((error) => {
	console.error(
		error instanceof Error ? error.message : "Project diary eval failed",
	);
	process.exitCode = 1;
});
