import "dotenv/config";
import { assertReviewedDiaryEnvironment } from "./reviewed-diary-environment";

type Flow =
	| "dashboard-chat"
	| "whatsapp-site-manager"
	| "whatsapp-worker"
	| "diary-reviewed";

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
			[
				"dashboard-chat",
				"whatsapp-site-manager",
				"whatsapp-worker",
				"diary-reviewed",
			] as Flow[]
		).includes(flow)
	) {
		throw new Error(`Unsupported --flow ${flow}.`);
	}
	if (flow === "diary-reviewed") {
		assertReviewedDiaryEnvironment();
		return;
	}
	const { assertEvalEnvironment } = await import("./eval-environment-guard");

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
