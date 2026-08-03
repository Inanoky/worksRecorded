import { prisma } from "@/lib/utils/db";

type EvalTargetFlow =
	| "dashboard-chat"
	| "whatsapp-site-manager"
	| "whatsapp-worker";

type AssertEvalEnvironmentArgs = {
	flow: EvalTargetFlow;
	siteId: string;
	userId?: string;
	workerId?: string;
};

function requireEnv(name: string) {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is required for real AI eval runs.`);
	return value;
}

function isEnabled(value: string | undefined) {
	return value === "true" || value === "1";
}

function maskedHostFromDatabaseUrl() {
	const value = process.env.DATABASE_URL;
	if (!value) return "missing";
	try {
		const url = new URL(value);
		return url.hostname;
	} catch {
		return "invalid-url";
	}
}

function requireMarkedEvalName(
	label: string,
	value: string | null | undefined,
) {
	if (process.env.AI_EVAL_REQUIRE_MARKED_NAMES === "false") return;
	if (value && /eval|test|ai/i.test(value)) return;
	throw new Error(
		`${label} must be clearly marked as eval/test/ai or set AI_EVAL_REQUIRE_MARKED_NAMES=false.`,
	);
}

export function shouldPreserveEvalRecords() {
	return isEnabled(process.env.AI_EVAL_PRESERVE_RECORDS);
}

export async function assertEvalEnvironment(args: AssertEvalEnvironmentArgs) {
	if (process.env.RUN_AI_EVALS !== "true") {
		throw new Error("Set RUN_AI_EVALS=true to run real AI evals.");
	}
	if (!isEnabled(process.env.AI_EVAL_ALLOW_SINGLE_DB)) {
		throw new Error(
			"Set AI_EVAL_ALLOW_SINGLE_DB=true after configuring a dedicated eval org/site/user/worker.",
		);
	}
	if (
		process.env.NODE_ENV === "production" &&
		!isEnabled(process.env.AI_EVAL_ALLOW_PRODUCTION_NODE_ENV)
	) {
		throw new Error(
			"AI eval runners refuse NODE_ENV=production unless AI_EVAL_ALLOW_PRODUCTION_NODE_ENV=true.",
		);
	}

	requireEnv("DATABASE_URL");
	requireEnv("OPENAI_API_KEY");

	const allowedOrganizationId = process.env.AI_EVAL_ALLOWED_ORGANIZATION_ID;
	if (!allowedOrganizationId) {
		throw new Error(
			"AI_EVAL_ALLOWED_ORGANIZATION_ID is required for single-DB eval runs.",
		);
	}

	const site = await prisma.site.findUnique({
		where: { id: args.siteId },
		select: {
			id: true,
			name: true,
			organizationId: true,
			sitediarysettings: { select: { id: true } },
			organization: { select: { id: true, name: true } },
		},
	});
	if (!site) throw new Error(`AI_EVAL_SITE_ID ${args.siteId} was not found.`);
	if (site.organizationId !== allowedOrganizationId) {
		throw new Error(
			`AI_EVAL_SITE_ID ${args.siteId} must belong to AI_EVAL_ALLOWED_ORGANIZATION_ID ${allowedOrganizationId}.`,
		);
	}
	if (!site.sitediarysettings) {
		throw new Error(
			`AI_EVAL_SITE_ID ${args.siteId} must have a site diary settings schema.`,
		);
	}
	requireMarkedEvalName("Eval organization", site.organization?.name);
	requireMarkedEvalName("Eval site", site.name);

	if (args.userId) {
		const user = await prisma.user.findUnique({
			where: { id: args.userId },
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				organizationId: true,
				lastSelectedSiteIdforWhatsapp: true,
			},
		});
		if (!user) throw new Error(`AI_EVAL_USER_ID ${args.userId} was not found.`);
		if (user.organizationId !== allowedOrganizationId) {
			throw new Error(
				`AI_EVAL_USER_ID ${args.userId} must belong to AI_EVAL_ALLOWED_ORGANIZATION_ID ${allowedOrganizationId}.`,
			);
		}
		if (
			args.flow === "whatsapp-site-manager" &&
			user.lastSelectedSiteIdforWhatsapp !== args.siteId
		) {
			throw new Error(
				`AI_EVAL_USER_ID ${args.userId} must have lastSelectedSiteIdforWhatsapp=${args.siteId}.`,
			);
		}
		requireMarkedEvalName(
			"Eval user",
			`${user.email} ${user.firstName} ${user.lastName}`,
		);
	}

	if (args.workerId) {
		const worker = await prisma.workers.findUnique({
			where: { id: args.workerId },
			select: {
				id: true,
				name: true,
				surname: true,
				phone: true,
				siteId: true,
				organizationId: true,
			},
		});
		if (!worker)
			throw new Error(`AI_EVAL_WORKER_ID ${args.workerId} was not found.`);
		if (worker.organizationId !== allowedOrganizationId) {
			throw new Error(
				`AI_EVAL_WORKER_ID ${args.workerId} must belong to AI_EVAL_ALLOWED_ORGANIZATION_ID ${allowedOrganizationId}.`,
			);
		}
		if (worker.siteId !== args.siteId) {
			throw new Error(
				`AI_EVAL_WORKER_ID ${args.workerId} must be assigned to AI_EVAL_SITE_ID ${args.siteId}.`,
			);
		}
		if (!worker.phone)
			throw new Error(
				`AI_EVAL_WORKER_ID ${args.workerId} must have a phone number.`,
			);
		requireMarkedEvalName(
			"Eval worker",
			`${worker.name ?? ""} ${worker.surname ?? ""}`,
		);
	}

	console.log("AI eval environment guard: PASS");
	console.log(
		JSON.stringify(
			{
				flow: args.flow,
				mode: "single-db-isolated-site",
				databaseHost: maskedHostFromDatabaseUrl(),
				organizationId: allowedOrganizationId,
				siteId: args.siteId,
				userId: args.userId ?? null,
				workerId: args.workerId ?? null,
				preserveRecords: shouldPreserveEvalRecords(),
			},
			null,
			2,
		),
	);
}
