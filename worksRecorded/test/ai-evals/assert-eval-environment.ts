import { assertEvalEnvironment } from "./eval-environment-guard";

type Flow = "dashboard-chat" | "whatsapp-site-manager" | "whatsapp-worker";

function getArgValue(name: string) {
	const index = process.argv.indexOf(name);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

function requiredEnv(name: string) {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is required.`);
	return value;
}

async function main() {
	const flow = (getArgValue("--flow") ?? "whatsapp-site-manager") as Flow;
	if (
		!(
			["dashboard-chat", "whatsapp-site-manager", "whatsapp-worker"] as Flow[]
		).includes(flow)
	) {
		throw new Error(`Unsupported --flow ${flow}.`);
	}

	const siteId = requiredEnv("AI_EVAL_SITE_ID");
	const userId =
		flow === "whatsapp-worker" ? undefined : requiredEnv("AI_EVAL_USER_ID");
	const workerId =
		flow === "whatsapp-worker" ? requiredEnv("AI_EVAL_WORKER_ID") : undefined;

	await assertEvalEnvironment({ flow, siteId, userId, workerId });
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
