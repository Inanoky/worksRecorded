import "dotenv/config";
import { spawnSync } from "node:child_process";

const FLOWS = [
	{
		aliases: ["dashboard", "dashboard-chat"],
		flow: "dashboard-chat",
		script: "eval:ai:dashboard",
	},
	{
		aliases: ["site-manager", "whatsapp-site-manager"],
		flow: "whatsapp-site-manager",
		script: "eval:ai:whatsapp-site-manager",
	},
	{
		aliases: ["worker", "whatsapp-worker"],
		flow: "whatsapp-worker",
		script: "eval:ai:whatsapp-worker",
	},
];

const MODES = new Set(["list", "dry", "run"]);
const TIERS = new Set(["smoke", "regression", "extended"]);

function usage() {
	return [
		"Usage:",
		"  npm run ai:list -- critical",
		"  npm run ai:dry -- critical",
		"  npm run ai:run -- critical",
		"  npm run ai:list -- tag bis",
		"  npm run ai:run -- flow whatsapp-site-manager tag correction",
		"",
		"Selectors:",
		"  critical",
		"  tag <name>",
		"  tier <smoke|regression|extended>",
		"  case <id>",
		"  flow <dashboard|whatsapp-site-manager|whatsapp-worker|all>",
	].join("\n");
}

function getValue(args, index, name) {
	const value = args[index + 1];
	if (!value || value.startsWith("--")) {
		throw new Error(`${name} requires a value.\n\n${usage()}`);
	}
	return value;
}

function findFlow(value) {
	if (value === "all") return "all";
	return FLOWS.find((flow) => flow.aliases.includes(value));
}

function parseArgs(rawArgs) {
	const [mode, ...args] = rawArgs;
	if (!MODES.has(mode)) {
		throw new Error(`Unknown AI eval mode "${mode ?? ""}".\n\n${usage()}`);
	}

	const filters = [];
	let selectedFlow = "all";
	let explicitFlow = false;

	for (let index = 0; index < args.length; index += 1) {
		const item = args[index];

		if (item === "critical" || item === "--critical") {
			filters.push("--critical");
			continue;
		}

		if (item === "tag" || item === "--tag") {
			filters.push("--tag", getValue(args, index, item));
			index += 1;
			continue;
		}

		if (item.startsWith("tag=") || item.startsWith("--tag=")) {
			filters.push("--tag", item.split("=").slice(1).join("="));
			continue;
		}

		if (item === "tier" || item === "--tier") {
			filters.push("--tier", getValue(args, index, item));
			index += 1;
			continue;
		}

		if (item.startsWith("tier=") || item.startsWith("--tier=")) {
			filters.push("--tier", item.split("=").slice(1).join("="));
			continue;
		}

		if (TIERS.has(item)) {
			filters.push("--tier", item);
			continue;
		}

		if (item === "case" || item === "--case") {
			filters.push("--case", getValue(args, index, item));
			index += 1;
			continue;
		}

		if (item.startsWith("case=") || item.startsWith("--case=")) {
			filters.push("--case", item.split("=").slice(1).join("="));
			continue;
		}

		if (item === "flow" || item === "--flow") {
			const flow = findFlow(getValue(args, index, item));
			if (!flow) throw new Error(`Unknown flow "${args[index + 1]}".`);
			selectedFlow = flow === "all" ? "all" : flow.flow;
			explicitFlow = true;
			index += 1;
			continue;
		}

		if (item.startsWith("flow=") || item.startsWith("--flow=")) {
			const value = item.split("=").slice(1).join("=");
			const flow = findFlow(value);
			if (!flow) throw new Error(`Unknown flow "${value}".`);
			selectedFlow = flow === "all" ? "all" : flow.flow;
			explicitFlow = true;
			continue;
		}

		const flow = findFlow(item);
		if (flow) {
			selectedFlow = flow === "all" ? "all" : flow.flow;
			explicitFlow = true;
			continue;
		}

		throw new Error(`Unknown AI eval selector "${item}".\n\n${usage()}`);
	}

	return { mode, filters, selectedFlow, explicitFlow };
}

function command(script, args) {
	return ["run", script, "--", ...args];
}

function runNpm(script, args, stdio = "inherit") {
	return spawnSync("npm", command(script, args), {
		cwd: process.cwd(),
		env: process.env,
		encoding: "utf8",
		stdio,
	});
}

function output(result) {
	return [result.stdout, result.stderr].filter(Boolean).join("");
}

function isNoMatch(result) {
	return output(result).includes("No eval cases matched filters");
}

function candidateFlows(selectedFlow) {
	if (selectedFlow === "all") return FLOWS;
	return FLOWS.filter((flow) => flow.flow === selectedFlow);
}

function selectMatchingFlows(
	candidates,
	filters,
	explicitFlow,
	printSelection,
) {
	const matches = [];

	for (const flow of candidates) {
		const result = runNpm(flow.script, ["--list", ...filters], "pipe");

		if (result.status === 0) {
			matches.push(flow);
			if (printSelection) process.stdout.write(output(result));
			continue;
		}

		if (!explicitFlow && isNoMatch(result)) {
			console.log(`Skipping ${flow.flow}: no matching eval cases.`);
			continue;
		}

		process.stderr.write(output(result));
		process.exit(result.status ?? 1);
	}

	if (matches.length === 0) {
		throw new Error("No eval flows matched the requested selectors.");
	}

	return matches;
}

function runGuard(flows) {
	for (const flow of flows) {
		const result = runNpm("eval:ai:guard", ["--flow", flow.flow]);
		if (result.status !== 0) process.exit(result.status ?? 1);
	}
}

function runEvalFlows(flows, filters, extraArgs) {
	for (const flow of flows) {
		const result = runNpm(flow.script, [...extraArgs, ...filters]);
		if (result.status !== 0) process.exit(result.status ?? 1);
	}
}

function runGate(flows) {
	const result = runNpm("eval:ai:gate", [
		"--flow",
		flows.map((flow) => flow.flow).join(","),
	]);
	if (result.status !== 0) process.exit(result.status ?? 1);
}

function main() {
	const { mode, filters, selectedFlow, explicitFlow } = parseArgs(
		process.argv.slice(2),
	);
	const matches = selectMatchingFlows(
		candidateFlows(selectedFlow),
		filters,
		explicitFlow,
		mode === "list",
	);

	if (mode === "list") return;

	if (mode === "dry") {
		runEvalFlows(matches, filters, ["--dry-run"]);
		return;
	}

	runGuard(matches);
	runEvalFlows(matches, filters, []);
	runGate(matches);
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
}
