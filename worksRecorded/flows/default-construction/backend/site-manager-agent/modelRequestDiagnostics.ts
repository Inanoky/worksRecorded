import { randomUUID } from "node:crypto";
import type { RunnableConfig } from "@langchain/core/runnables";
import { invokeSiteManagerModel } from "./aiDeadline";

type ModelTokenUsage = {
	inputTokens: number | null;
	outputTokens: number | null;
	totalTokens: number | null;
	reasoningTokens: number | null;
	cachedInputTokens: number | null;
};

const unknownTokenUsage = (): ModelTokenUsage => ({
	inputTokens: null,
	outputTokens: null,
	totalTokens: null,
	reasoningTokens: null,
	cachedInputTokens: null,
});
const object = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" ? (value as Record<string, unknown>) : {};
const tokenCount = (value: unknown) =>
	typeof value === "number" && Number.isFinite(value) && value >= 0
		? value
		: null;

export type ModelRequestDiagnostics = {
	clientRequestId: string;
	requestId: string | null;
	phase:
		| "not_started"
		| "waiting_for_headers"
		| "reading_body"
		| "body_received";
	outcome: "running" | "completed" | "timeout" | "error";
	httpStatus: number | null;
	headersMs: number | null;
	firstBodyByteMs: number | null;
	bodyCompleteMs: number | null;
	serverProcessingMs: number | null;
	receivedBytes: number;
	errorName: string | null;
	errorCode: string | null;
	requestBytes: number | null;
	reasoningEffort: string | null;
	maxOutputTokens: number | null;
	streaming: boolean | null;
	responseId: string | null;
	responseStatus: string | null;
	incompleteReason: string | null;
	responseBodyJsonValid: boolean | null;
	outputTextCharacters: number | null;
	usage: ModelTokenUsage;
};

const failures = new WeakMap<object, ModelRequestDiagnostics>();
const safeCode = (value: unknown) =>
	typeof value === "string" && /^[\w.-]{1,100}$/u.test(value) ? value : null;

export function assertCompleteModelResponse(raw: unknown) {
	const metadata = (
		raw as {
			response_metadata?: { status?: string; finish_reason?: string };
		} | null
	)?.response_metadata;
	if (
		metadata?.status === "incomplete" ||
		metadata?.finish_reason === "length"
	) {
		throw new Error("OPENAI_RESPONSE_INCOMPLETE");
	}
}

export function getModelFailureDiagnostics(error: unknown) {
	return error && typeof error === "object" ? failures.get(error) : undefined;
}

export function getModelFailureTokenUsage(error: unknown) {
	return getModelFailureDiagnostics(error)?.usage ?? unknownTokenUsage();
}

export function canRetryIncompleteModelResponse(
	diagnostics: ModelRequestDiagnostics,
	attempt: number,
	remainingMs: number,
) {
	return (
		attempt === 0 &&
		remainingMs >= 30_000 &&
		diagnostics.httpStatus === 200 &&
		diagnostics.phase === "body_received" &&
		(diagnostics.responseStatus === "incomplete" ||
			diagnostics.errorName === "SyntaxError")
	);
}

export function createModelRequestDiagnostics(args: {
	model: string;
	purpose: string;
	fetch?: typeof globalThis.fetch;
}) {
	const state: ModelRequestDiagnostics = {
		clientRequestId: randomUUID(),
		requestId: null,
		phase: "not_started",
		outcome: "running",
		httpStatus: null,
		headersMs: null,
		firstBodyByteMs: null,
		bodyCompleteMs: null,
		serverProcessingMs: null,
		receivedBytes: 0,
		errorName: null,
		errorCode: null,
		requestBytes: null,
		reasoningEffort: null,
		maxOutputTokens: null,
		streaming: null,
		responseId: null,
		responseStatus: null,
		incompleteReason: null,
		responseBodyJsonValid: null,
		outputTextCharacters: null,
		usage: unknownTokenUsage(),
	};
	const snapshot = () => ({ ...state, usage: { ...state.usage } });
	const captureResponseMetadata = (text: string) => {
		let response: Record<string, unknown>;
		try {
			response = object(JSON.parse(text));
			state.responseBodyJsonValid = true;
		} catch {
			state.responseBodyJsonValid = false;
			return;
		}
		state.responseId = safeCode(response.id);
		const choices = Array.isArray(response.choices) ? response.choices : [];
		state.responseStatus =
			safeCode(response.status) ?? safeCode(object(choices[0]).finish_reason);
		state.incompleteReason =
			safeCode(object(response.incomplete_details).reason) ??
			(state.responseStatus === "length" ? "max_output_tokens" : null);
		const usage = object(response.usage);
		state.usage = {
			inputTokens: tokenCount(usage.input_tokens ?? usage.prompt_tokens),
			outputTokens: tokenCount(usage.output_tokens ?? usage.completion_tokens),
			totalTokens: tokenCount(usage.total_tokens),
			reasoningTokens: tokenCount(
				object(usage.output_tokens_details ?? usage.completion_tokens_details)
					.reasoning_tokens,
			),
			cachedInputTokens: tokenCount(
				object(usage.input_tokens_details ?? usage.prompt_tokens_details)
					.cached_tokens,
			),
		};
		if (Array.isArray(response.output))
			state.outputTextCharacters = response.output.reduce((total, item) => {
				const content = object(item).content;
				return (
					total +
					(Array.isArray(content)
						? content.reduce(
								(sum, part) =>
									sum +
									(typeof object(part).text === "string"
										? String(object(part).text).length
										: 0),
								0,
							)
						: 0)
				);
			}, 0);
	};
	const log = (event: string) =>
		console.info("[Site diary model request]", {
			event,
			model: args.model,
			purpose: args.purpose,
			...snapshot(),
		});
	const fetch: typeof globalThis.fetch = async (input, init) => {
		const started = Date.now();
		state.phase = "waiting_for_headers";
		if (typeof init?.body === "string") {
			state.requestBytes = new TextEncoder().encode(init.body).byteLength;
			try {
				const payload = JSON.parse(init.body);
				state.reasoningEffort = safeCode(
					payload.reasoning?.effort ?? payload.reasoning_effort,
				);
				const limit =
					payload.max_output_tokens ??
					payload.max_completion_tokens ??
					payload.max_tokens;
				state.maxOutputTokens =
					typeof limit === "number" && Number.isFinite(limit) ? limit : null;
				state.streaming = payload.stream === true;
			} catch {
				state.reasoningEffort = null;
				state.maxOutputTokens = null;
				state.streaming = null;
			}
		}
		const headers = new Headers(
			typeof Request !== "undefined" && input instanceof Request
				? input.headers
				: undefined,
		);
		new Headers(init?.headers).forEach((value, key) => {
			headers.set(key, value);
		});
		headers.set("X-Client-Request-Id", state.clientRequestId);
		log("request_started");
		const response = await (args.fetch ?? globalThis.fetch)(input, {
			...init,
			headers,
		});
		state.headersMs = Date.now() - started;
		state.httpStatus = response.status;
		state.requestId = safeCode(response.headers.get("x-request-id"));
		const processing = response.headers.get("openai-processing-ms");
		state.serverProcessingMs =
			processing !== null &&
			Number.isFinite(Number(processing)) &&
			Number(processing) >= 0
				? Number(processing)
				: null;

		state.phase = response.body ? "reading_body" : "body_received";
		log("response_headers");
		if (!response.body) {
			state.bodyCompleteMs = Date.now() - started;
			return response;
		}
		const reader = response.body.getReader();
		const decoder = response.headers
			.get("content-type")
			?.includes("application/json")
			? new TextDecoder()
			: null;
		let metadataText: string | null = decoder ? "" : null;
		const body = new ReadableStream<Uint8Array>({
			async pull(controller) {
				try {
					const chunk = await reader.read();
					if (chunk.done) {
						state.phase = "body_received";
						state.bodyCompleteMs = Date.now() - started;
						if (metadataText !== null && decoder)
							captureResponseMetadata(metadataText + decoder.decode());
						controller.close();
						reader.releaseLock();
					} else {
						if (chunk.value.byteLength) {
							state.firstBodyByteMs ??= Date.now() - started;
							state.receivedBytes += chunk.value.byteLength;
							if (metadataText !== null && decoder)
								metadataText =
									state.receivedBytes <= 2_097_152
										? metadataText +
											decoder.decode(chunk.value, { stream: true })
										: null;
						}
						controller.enqueue(chunk.value);
					}
				} catch (error) {
					controller.error(error);
					reader.releaseLock();
				}
			},
			async cancel(reason) {
				try {
					await reader.cancel(reason);
				} finally {
					reader.releaseLock();
				}
			},
		});
		return new Response(body, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});
	};
	const run = async <T>(
		invoke: (config: RunnableConfig) => Promise<T>,
		config: RunnableConfig = {},
	) => {
		const metadata = config.metadata ?? {};
		metadata.modelRequestDiagnostics = state;
		try {
			const result = await invokeSiteManagerModel(invoke, {
				...config,
				metadata,
			});
			state.outcome = "completed";
			return result;
		} catch (error) {
			const item = error as {
				name?: unknown;
				code?: unknown;
				cause?: { code?: unknown };
			} | null;
			state.errorName = safeCode(item?.name);
			state.errorCode =
				safeCode(item?.code) ??
				safeCode(item?.cause?.code) ??
				state.incompleteReason;
			state.outcome =
				state.errorName === "SiteManagerAiTimeoutError" ||
				state.errorName === "APIConnectionTimeoutError"
					? "timeout"
					: "error";
			if (error && typeof error === "object") failures.set(error, snapshot());
			throw error;
		} finally {
			if (config.metadata) config.metadata.modelRequestDiagnostics = snapshot();
			log("request_finished");
		}
	};
	return { configuration: { fetch }, run, snapshot };
}
