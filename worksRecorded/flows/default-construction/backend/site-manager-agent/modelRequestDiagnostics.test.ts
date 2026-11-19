import { spawnSync } from "node:child_process";
import {
	canRetryIncompleteModelResponse,
	createModelRequestDiagnostics,
} from "./modelRequestDiagnostics";

it("bounds retries to one incomplete response with time left before any persistence", () => {
	const response = {
		...createModelRequestDiagnostics({
			model: "test",
			purpose: "extraction",
		}).snapshot(),
		httpStatus: 200,
		phase: "body_received" as const,
		errorName: "SyntaxError",
	};
	expect(canRetryIncompleteModelResponse(response, 0, 30_000)).toBe(true);
	expect(canRetryIncompleteModelResponse(response, 1, 30_000)).toBe(false);
	expect(canRetryIncompleteModelResponse(response, 0, 29_999)).toBe(false);
	expect(
		canRetryIncompleteModelResponse(
			{ ...response, httpStatus: 429 },
			0,
			60_000,
		),
	).toBe(false);
	expect(
		canRetryIncompleteModelResponse(
			{ ...response, phase: "waiting_for_headers" },
			0,
			60_000,
		),
	).toBe(false);
	expect(
		canRetryIncompleteModelResponse(
			{ ...response, errorName: "SiteManagerAiTimeoutError" },
			0,
			60_000,
		),
	).toBe(false);
});

function runLocalScript(body: string) {
	const result = spawnSync(
		process.execPath,
		[
			"--import",
			"tsx",
			"--input-type=module",
			"-e",
			`
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { ChatOpenAI } = require("@langchain/openai");
const { createModelRequestDiagnostics, getModelFailureDiagnostics } = require("./flows/default-construction/backend/site-manager-agent/modelRequestDiagnostics.ts");
const { runWithWhatsappSourceContext } = require("./server/ai-flows/agents/whatsapp-agent/whatsappSourceContext.ts");
const logs = [];
console.info = (...values) => logs.push(values);
${body}
`,
		],
		{ cwd: process.cwd(), encoding: "utf8", timeout: 15_000 },
	);
	expect(result.error).toBeUndefined();
	expect(result.stderr).toBe("");
	expect(result.status).toBe(0);
}

it("observes an actual LangChain/OpenAI response through a local fetch without consuming or changing its body", () => {
	runLocalScript(`
let sentId;
const diagnostics = createModelRequestDiagnostics({ model: "gpt-6.1-sol", purpose: "extraction", fetch: async (url, init) => {
  assert.equal(String(url), "https://api.openai.com/v1/responses");
  const headers = new Headers(init.headers);
  sentId = headers.get("X-Client-Request-Id");
  assert.equal(headers.get("Authorization"), "Bearer local-test-only");
  return new Response(JSON.stringify({ id: "resp_local", object: "response", model: "gpt-6.1-sol", status: "completed", created_at: 1, output: [{ id: "msg_local", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: "Local result", annotations: [] }] }], usage: { input_tokens: 10, output_tokens: 2, total_tokens: 12 } }), { headers: { "Content-Type": "application/json", "x-request-id": "req_local", "openai-processing-ms": "24.5" } });
}});
const llm = new ChatOpenAI({ apiKey: "local-test-only", model: "gpt-6.1-sol", useResponsesApi: true, maxRetries: 0, configuration: diagnostics.configuration });
const result = await diagnostics.run((config) => llm.invoke("Local input", config));
assert.deepEqual(result.content, [{ type: "text", text: "Local result", annotations: [] }]);
assert.equal(result.usage_metadata.total_tokens, 12);
assert.equal(sentId, diagnostics.snapshot().clientRequestId);
assert.equal(diagnostics.snapshot().requestId, "req_local");
assert.equal(diagnostics.snapshot().phase, "body_received");
assert.equal(diagnostics.snapshot().outcome, "completed");
assert.equal(diagnostics.snapshot().serverProcessingMs, 24.5);
assert.ok(diagnostics.snapshot().receivedBytes > 0);
assert.equal(JSON.stringify(logs).includes("local-test-only"), false);
assert.equal(JSON.stringify(logs).includes("Local input"), false);
`);
});

it("records HTTP failure identity and code without logging credentials or provider error messages", () => {
	runLocalScript(`
let requests = 0;
const diagnostics = createModelRequestDiagnostics({ model: "gpt-6.1-sol", purpose: "extraction", fetch: async () => {
  requests++;
  return new Response(JSON.stringify({ error: { message: "private provider message", type: "rate_limit_error", code: "rate_limit_exceeded" } }), { status: 429, headers: { "Content-Type": "application/json", "x-request-id": "req_limit" } });
}});
const llm = new ChatOpenAI({ apiKey: "local-test-only", model: "gpt-6.1-sol", useResponsesApi: true, maxRetries: 0, configuration: diagnostics.configuration });
await assert.rejects(() => diagnostics.run((config) => llm.invoke("Local input", config)), (error) => {
  assert.equal(getModelFailureDiagnostics(error).httpStatus, 429);
  assert.equal(getModelFailureDiagnostics(error).requestId, "req_limit");
  return true;
});

assert.equal(requests, 1);
assert.equal(diagnostics.snapshot().outcome, "error");
assert.equal(diagnostics.snapshot().errorCode, "rate_limit_exceeded");
assert.equal(JSON.stringify(logs).includes("private provider message"), false);
`);
});

it("preserves provider status and charged usage even when the SDK cannot parse incomplete JSON output", () => {
	runLocalScript(`
const { z } = require("zod");
const diagnostics = createModelRequestDiagnostics({ model: "gpt-6.1-sol", purpose: "extraction", fetch: async () => new Response(JSON.stringify({
  id: "resp_incomplete", object: "response", model: "gpt-6.1-sol", status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, created_at: 1,
  text: { format: { type: "json_schema", name: "extract", schema: { type: "object" } } },
  output: [{ id: "msg_incomplete", type: "message", role: "assistant", status: "incomplete", content: [{ type: "output_text", text: '{"records":[', annotations: [] }] }],
  usage: { input_tokens: 10, output_tokens: 8192, total_tokens: 8202, output_tokens_details: { reasoning_tokens: 50 }, input_tokens_details: { cached_tokens: 8 } },
}), { headers: { "Content-Type": "application/json", "x-request-id": "req_incomplete" } }) });
const llm = new ChatOpenAI({ apiKey: "local-test-only", model: "gpt-6.1-sol", useResponsesApi: true, maxRetries: 0, configuration: diagnostics.configuration });
const structured = llm.withStructuredOutput(z.object({ records: z.array(z.string()) }), { includeRaw: true });
await assert.rejects(() => diagnostics.run((config) => structured.invoke("Local input", config)));
const saved = diagnostics.snapshot();
assert.equal(saved.responseBodyJsonValid, true);
assert.equal(saved.responseStatus, "incomplete");
assert.equal(saved.incompleteReason, "max_output_tokens");
assert.equal(saved.usage.outputTokens, 8192);
assert.equal(saved.usage.reasoningTokens, 50);
assert.equal(saved.usage.cachedInputTokens, 8);
assert.equal(saved.responseId, "resp_incomplete");
assert.equal(saved.errorCode, "max_output_tokens");
assert.equal(JSON.stringify(logs).includes('{"records":['), false);
`);
});

it("distinguishes a timeout before headers from a timeout while reading an incomplete body", () => {
	runLocalScript(`
for (const hasHeaders of [false, true]) {
  const diagnostics = createModelRequestDiagnostics({ model: "gpt-6.1-sol", purpose: "extraction", fetch: async (_url, init) => {
    if (!hasHeaders) return new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true }));
    const body = new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode("partial body"));
      init.signal.addEventListener("abort", () => controller.error(init.signal.reason), { once: true });
    }});
    return new Response(body, { headers: { "x-request-id": "req_partial" } });
  }});
  await runWithWhatsappSourceContext({ webhookStartedAtMs: Date.now() - 179_950 }, async () => {
    await assert.rejects(() => diagnostics.run(async (config) => {
      const response = await diagnostics.configuration.fetch("https://api.openai.com/v1/responses", { signal: config.signal });
      return response.text();
    }), (error) => {
      const saved = getModelFailureDiagnostics(error);
      assert.equal(saved.outcome, "timeout");
      assert.equal(saved.phase, hasHeaders ? "reading_body" : "waiting_for_headers");
      assert.equal(saved.requestId, hasHeaders ? "req_partial" : null);
      assert.equal(saved.bodyCompleteMs, null);
      assert.equal(saved.receivedBytes > 0, hasHeaders);
      return true;
    });
  });
}
`);
});
