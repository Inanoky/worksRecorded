import { spawnSync } from "node:child_process";

it("preserves the selected reasoning effort in actual LangChain API parameters without making requests", () => {
	const script = `
const { ChatOpenAI } = require("@langchain/openai");
const { diaryModelReasoningOptions, diaryModelOutputTokenLimit } = require("./flows/default-construction/backend/site-manager-agent/diaryModelSettings.ts");
const results = [];
for (const effort of ["low", "medium", "high"]) {
  for (const useResponsesApi of [true, false]) {
    const model = useResponsesApi ? "gpt-6.1-sol" : "gpt-5.6-terra";
    const llm = new ChatOpenAI({
      apiKey: "local-parameter-check-no-network",
      model,
      useResponsesApi,
      maxTokens: diaryModelOutputTokenLimit("Īsa dienasgrāmatas ziņa"),
      ...diaryModelReasoningOptions(effort, useResponsesApi),
    });
    const params = llm.invocationParams({});
    results.push({ model, effort, useResponsesApi, sent: useResponsesApi ? params.reasoning?.effort : params.reasoning_effort, maxOutput: params.max_output_tokens ?? params.max_completion_tokens ?? params.max_tokens });
  }
}
process.stdout.write(JSON.stringify(results));
`;
	const result = spawnSync(
		process.execPath,
		["--import", "tsx", "-e", script],
		{
			cwd: process.cwd(),
			encoding: "utf8",
			timeout: 15000,
		},
	);
	expect(result.error).toBeUndefined();
	expect(result.status).toBe(0);
	const rows: Array<{ effort: string; sent?: string; maxOutput: number }> =
		JSON.parse(result.stdout);
	expect(rows).toHaveLength(6);
	for (const row of rows) {
		expect(row.sent).toBe(row.effort);
		expect(row.maxOutput).toBe(8192);
	}
});
