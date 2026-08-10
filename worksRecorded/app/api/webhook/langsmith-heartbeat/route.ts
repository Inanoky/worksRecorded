import { Client } from "langsmith/client";
import type { Run } from "langsmith/schemas";
import { NextResponse } from "next/server";

import {
	assessLangSmithRunQuality,
	extractOutputText,
	getRunFlow,
	getRunLatencyMs,
} from "@/lib/langsmith-heartbeat/quality";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_LOOKBACK_MINUTES = 11;
const DEFAULT_LIMIT = 50;
const DEFAULT_HIGH_LATENCY_MS = 30000;
const DEFAULT_TAG = "works-recorded";

function getNumberEnv(name: string, fallback: number) {
	const value = process.env[name];
	if (!value) return fallback;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isAuthorized(request: Request) {
	const url = new URL(request.url);
	const secret = process.env.CRON_SECRET;
	if (!secret) return false;

	return (
		request.headers.get("authorization") === `Bearer ${secret}` ||
		url.searchParams.get("secret") === secret
	);
}

function getRunMetadata(run: Run): Record<string, unknown> {
	const metadata = run.extra?.metadata;
	return metadata && typeof metadata === "object" && !Array.isArray(metadata)
		? metadata
		: {};
}

function getRunTimeIso(value: unknown) {
	if (value instanceof Date) return value.toISOString();
	if (typeof value === "number") {
		const ms = value < 1000000000000 ? value * 1000 : value;
		return new Date(ms).toISOString();
	}
	if (typeof value === "string") return value;
	return null;
}

function preview(text: string, maxLength = 500) {
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength)}...`;
}

function buildFilter(sinceIso: string) {
	const tag = process.env.LANGSMITH_HEARTBEAT_TAG ?? DEFAULT_TAG;
	const timeFilter = `gt(start_time, "${sinceIso}")`;
	const cleanTag = tag.trim();
	return cleanTag ? `and(${timeFilter}, has(tags, "${cleanTag}"))` : timeFilter;
}

async function notifyWebhook(webhookUrl: string, payload: unknown) {
	const response = await fetch(webhookUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		throw new Error(
			`n8n webhook failed (${response.status}): ${body.slice(0, 500)}`,
		);
	}
}

export async function GET(request: Request) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const projectName =
		process.env.LANGSMITH_PROJECT ?? process.env.LANGCHAIN_PROJECT;
	const webhookUrl =
		process.env.LANGSMITH_HEARTBEAT_WEBHOOK_URL ??
		process.env.N8N_LANGSMITH_HEARTBEAT_WEBHOOK_URL;

	if (!projectName) {
		return NextResponse.json(
			{ error: "Missing LANGSMITH_PROJECT or LANGCHAIN_PROJECT" },
			{ status: 500 },
		);
	}

	if (!webhookUrl) {
		return NextResponse.json(
			{
				error:
					"Missing LANGSMITH_HEARTBEAT_WEBHOOK_URL or N8N_LANGSMITH_HEARTBEAT_WEBHOOK_URL",
			},
			{ status: 500 },
		);
	}

	const lookbackMinutes = getNumberEnv(
		"LANGSMITH_HEARTBEAT_LOOKBACK_MINUTES",
		DEFAULT_LOOKBACK_MINUTES,
	);
	const limit = Math.min(
		getNumberEnv("LANGSMITH_HEARTBEAT_LIMIT", DEFAULT_LIMIT),
		100,
	);
	const highLatencyMs = getNumberEnv(
		"LANGSMITH_HEARTBEAT_HIGH_LATENCY_MS",
		DEFAULT_HIGH_LATENCY_MS,
	);
	const checkedAt = new Date();
	const since = new Date(checkedAt.getTime() - lookbackMinutes * 60 * 1000);

	const client = new Client({
		apiUrl: process.env.LANGSMITH_ENDPOINT,
		apiKey: process.env.LANGSMITH_API_KEY,
	});

	const runs: Run[] = [];
	for await (const run of client.listRuns({
		projectName,
		isRoot: true,
		limit,
		filter: buildFilter(since.toISOString()),
		order: "desc",
	})) {
		runs.push(run);
	}

	const deliveries: Array<{
		runId: string | null;
		ok: boolean;
		error?: string;
	}> = [];

	for (const run of runs) {
		const outputText = extractOutputText(run.outputs);
		const quality = assessLangSmithRunQuality(run, { highLatencyMs });
		const metadata = getRunMetadata(run);
		const runId = typeof run.id === "string" ? run.id : null;

		const payload = {
			event: "langsmith.message",
			source: "works-recorded-langsmith-heartbeat",
			dedupeKey: runId,
			checkedAt: checkedAt.toISOString(),
			project: projectName,
			lookbackMinutes,
			run: {
				id: runId,
				traceId: typeof run.trace_id === "string" ? run.trace_id : null,
				name: typeof run.name === "string" ? run.name : null,
				runType: typeof run.run_type === "string" ? run.run_type : null,
				flow: getRunFlow(run),
				startedAt: getRunTimeIso(run.start_time),
				endedAt: getRunTimeIso(run.end_time),
				latencyMs: getRunLatencyMs(run),
				error: run.error ? String(run.error).slice(0, 1000) : null,
				tags: Array.isArray(run.tags)
					? run.tags.filter((tag: unknown) => typeof tag === "string")
					: [],
				metadata: {
					flow: typeof metadata.flow === "string" ? metadata.flow : null,
					channel:
						typeof metadata.channel === "string" ? metadata.channel : null,
					threadId:
						typeof metadata.threadId === "string" ? metadata.threadId : null,
					siteId: typeof metadata.siteId === "string" ? metadata.siteId : null,
					userId: typeof metadata.userId === "string" ? metadata.userId : null,
					workerId:
						typeof metadata.workerId === "string" ? metadata.workerId : null,
					model: typeof metadata.model === "string" ? metadata.model : null,
				},
				outputPreview: preview(outputText),
			},
			quality,
		};

		try {
			await notifyWebhook(webhookUrl, payload);
			deliveries.push({ runId, ok: true });
		} catch (error) {
			console.error("[langsmith-heartbeat] webhook delivery failed", {
				runId,
				error,
			});
			deliveries.push({
				runId,
				ok: false,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	const failedDeliveries = deliveries.filter((delivery) => !delivery.ok);

	return NextResponse.json(
		{
			ok: failedDeliveries.length === 0,
			checkedAt: checkedAt.toISOString(),
			project: projectName,
			lookbackMinutes,
			runsChecked: runs.length,
			delivered: deliveries.filter((delivery) => delivery.ok).length,
			failed: failedDeliveries.length,
			failures: failedDeliveries,
		},
		{ status: failedDeliveries.length ? 502 : 200 },
	);
}
