export type LangSmithHeartbeatSeverity = "ok" | "warning" | "error";

export type LangSmithHeartbeatIssue = {
	severity: LangSmithHeartbeatSeverity;
	reasons: string[];
};

export type LangSmithHeartbeatRunLike = {
	error?: unknown;
	outputs?: unknown;
	extra?: unknown;
	tags?: unknown;
	start_time?: unknown;
	end_time?: unknown;
	startTime?: unknown;
	endTime?: unknown;
	latency?: unknown;
};

const FAILURE_PHRASES = [
	"sorry, there was a temporary issue",
	"something went wrong",
	"i can't help",
	"i cannot help",
	"unable to process",
	"temporary issue",
];

const LATVIAN_MARKERS = ["ā", "č", "ē", "ģ", "ī", "ķ", "ļ", "ņ", "š", "ū", "ž"];
const COMMON_ENGLISH_WORDS =
	/\b(the|and|you|your|please|sorry|unable|cannot|can't|work|worker|site|hours?)\b/i;

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function collectStrings(value: unknown, result: string[] = [], depth = 0) {
	if (depth > 6 || result.join(" ").length > 4000) return result;

	if (typeof value === "string") {
		result.push(value);
		return result;
	}

	if (Array.isArray(value)) {
		for (const item of value) collectStrings(item, result, depth + 1);
		return result;
	}

	if (isRecord(value)) {
		for (const [key, item] of Object.entries(value)) {
			if (["id", "run_id", "trace_id", "thread_id"].includes(key.toLowerCase()))
				continue;
			collectStrings(item, result, depth + 1);
		}
	}

	return result;
}

function toDateMs(value: unknown) {
	if (value instanceof Date) return value.getTime();
	if (typeof value === "number")
		return value < 1000000000000 ? value * 1000 : value;
	if (typeof value === "string") {
		const ms = new Date(value).getTime();
		return Number.isNaN(ms) ? null : ms;
	}
	return null;
}

export function extractOutputText(outputs: unknown) {
	return collectStrings(outputs).join("\n").replace(/\s+/g, " ").trim();
}

export function getRunLatencyMs(run: LangSmithHeartbeatRunLike) {
	if (typeof run.latency === "number") {
		return run.latency < 1000
			? Math.round(run.latency * 1000)
			: Math.round(run.latency);
	}

	const startMs = toDateMs(run.start_time ?? run.startTime);
	const endMs = toDateMs(run.end_time ?? run.endTime);
	if (startMs === null || endMs === null || endMs < startMs) return null;
	return endMs - startMs;
}

export function getRunFlow(run: LangSmithHeartbeatRunLike) {
	const extra = isRecord(run.extra) ? run.extra : {};
	const metadata = isRecord(extra.metadata) ? extra.metadata : {};
	const directFlow = metadata.flow;
	if (typeof directFlow === "string" && directFlow.trim())
		return directFlow.trim();

	const tags = Array.isArray(run.tags) ? run.tags : [];
	const flowTag = tags.find(
		(tag): tag is string => typeof tag === "string" && tag.startsWith("flow:"),
	);
	return flowTag?.slice("flow:".length) ?? null;
}

export function assessLangSmithRunQuality(
	run: LangSmithHeartbeatRunLike,
	options: { minOutputChars?: number; highLatencyMs?: number } = {},
): LangSmithHeartbeatIssue {
	const minOutputChars = options.minOutputChars ?? 12;
	const highLatencyMs = options.highLatencyMs ?? 30000;
	const reasons: string[] = [];
	const outputText = extractOutputText(run.outputs);
	const latencyMs = getRunLatencyMs(run);
	const flow = getRunFlow(run);

	if (run.error) reasons.push("langsmith_error");
	if (!outputText) reasons.push("empty_output");
	if (outputText && outputText.length < minOutputChars)
		reasons.push("short_output");

	const normalizedOutput = outputText.toLowerCase();
	if (FAILURE_PHRASES.some((phrase) => normalizedOutput.includes(phrase))) {
		reasons.push("failure_phrase");
	}

	if (
		outputText.length >= minOutputChars &&
		(flow === "dashboard-chat" ||
			flow === "whatsapp-site-manager" ||
			flow === "whatsapp-worker") &&
		!LATVIAN_MARKERS.some((marker) => normalizedOutput.includes(marker)) &&
		COMMON_ENGLISH_WORDS.test(outputText)
	) {
		reasons.push("likely_non_latvian_output");
	}

	if (latencyMs !== null && latencyMs > highLatencyMs)
		reasons.push("high_latency");

	return {
		severity: run.error ? "error" : reasons.length ? "warning" : "ok",
		reasons,
	};
}
