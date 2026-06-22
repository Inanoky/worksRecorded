# Dashboard AI Eval Suite

Lightweight regression tests for the real dashboard chat agent (`dashboard-chat` / `OrchestratingAgentV2`). The suite is opt-in because real runs call AI models and write isolated LangGraph checkpoint rows.

## Current State

- Pilot flow: dashboard chat only.
- Main language expectation: Latvian.
- One English compatibility case is kept intentionally.
- Eval prompts use read-only tools only.
- Results are saved locally in `.ai-eval-results/dashboard-*.json`.
- `.ai-eval-results` is ignored by git.
- Real eval runs use thread IDs like `eval:dashboard-chat:<siteId>:<caseId>:<runId>`.

## Commands

Validate fixture/schema loading only:

```bash
npm run eval:ai:dashboard -- --dry-run
```

Run validator unit tests:

```bash
npm test -- test/ai-evals/validators.test.ts
```

Run real AI evals after loading `.env`:

```bash
set -a
source .env
set +a
npm run eval:ai:dashboard
```

Run with optional LLM judge:

```bash
npm run eval:ai:dashboard -- --judge
```

Useful optional env vars:

```env
AI_EVAL_AGENT_MODEL=gpt-5.4-mini
AI_EVAL_JUDGE_MODEL=gpt-4.1-mini
AI_EVAL_SLOW_TURN_MS=15000
```

Required env vars for real evals:

```env
RUN_AI_EVALS=true
OPENAI_API_KEY=...
DATABASE_URL=...
AI_EVAL_SITE_ID=...
AI_EVAL_USER_ID=...
```

## How Results Work

Each turn is checked by deterministic validators:

- `requiredAll`: every listed text signal must appear.
- `requiredAny`: at least one listed text signal must appear.
- `forbidden`: listed unsafe text must not appear.
- `expectedLanguage`: `lv`, `en`, or `same-as-user`.
- `requireClarification`: answer must ask for clarification or state missing/uncertain data.
- `minChars`: guards against empty or trivial replies.

The JSON report includes:

- per-turn answer, status, thread ID, and `latencyMs`
- requested model, actual provider model, token usage, and finish reason when LangChain returns them
- summary counts for deterministic failures and judge warnings/failures
- latency summary: `totalMs`, `averageMs`, `slowestTurn`, `turnsOverThreshold`

Model fields:

- `requestedModel`: app/model alias requested by the runner, for example `gpt-5.4`.
- `actualModel`: provider-reported model from the final AI message, for example `gpt-5-mini-2025-08-07`.
- `actualModels`: unique provider-reported models seen across the report.

## What The Judge Is

The judge is an optional second model call that grades the answer as `pass`, `warn`, or `fail`. It is useful for fuzzy checks like grounding, tone, hallucination risk, and answer quality. It is slower and costs extra, so normal runs can skip it.

Use deterministic validators for hard rules. Use the judge for quality review.

## Adding A Case

Add a new object in `dashboard-cases.ts`:

```ts
{
  id: "latvian-no-data-materials",
  intent: "Verify the assistant admits missing material data in Latvian.",
  turns: [
    {
      prompt:
        "Atbildi latviski. Tikai lasīšanas režīmā pārbaudi, vai šodien ir apstiprināta materiālu piegāde. Ja datos tas nav redzams, pasaki to skaidri.",
      requiredAny: ["nav", "datos", "nevaru", "apstiprin"],
      forbidden: ["saved successfully", "saglabāts veiksmīgi"],
      expectedLanguage: "lv",
      requireClarification: true,
      minChars: 30,
    },
  ],
}
```

For context tests, use multiple turns in one case. They share the same eval thread:

```ts
{
  id: "latvian-context-retention-example",
  intent: "Verify short-term context retention in Latvian.",
  turns: [
    {
      prompt: "Atceries, ka šodienas fokuss ir fasādes darbi Zonā B. Neko nesaglabā.",
      requiredAll: ["fasād", "zon"],
      expectedLanguage: "lv",
    },
    {
      prompt: "Kāds bija šodienas fokuss?",
      requiredAll: ["fasād", "zon"],
      expectedLanguage: "lv",
    },
  ],
}
```

## Adjusting Validators

Update `validators.ts` when text matching is too strict or too loose.

- Add Latvian stems to `PARTIAL_TEXT_MATCHES` for inflected words such as `beton`, `dienasgr`, `ierakst`.
- Add language markers to `LATVIAN_MARKERS` only when they are common enough to reduce false failures.
- Add unsafe phrases to `UNSAFE_CONFIRMATIONS` when the assistant starts producing risky success messages.
- Add tests in `validators.test.ts` for every validator change.

## Future Improvements

- Store token usage from LangChain responses in the JSON report.
- Add per-tool latency and tool-call counts.
- Add a cleanup script for eval checkpoint rows by `eval:dashboard-chat:` prefix.
- Add dedicated flows for WhatsApp site manager and worker clock-in.
- Add a small HTML/CLI summary for comparing two report files before and after prompt/context changes.
- Replace heuristic language checks with a small deterministic language detector or judge-only language rubric if the marker approach becomes noisy.
