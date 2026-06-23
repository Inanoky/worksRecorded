# AI Eval Suites

Lightweight regression tests for real AI flows. These suites are opt-in because real runs call AI models and may write isolated LangGraph checkpoint rows or temporary eval records.

## Current State

- Dashboard chat flow: `dashboard-chat` / `OrchestratingAgentV2`.
- WhatsApp site-manager flow: `whatsapp-site-manager` via the real Meta webhook route.
- Main language expectation: Latvian.
- One English compatibility case is kept intentionally.
- Dashboard eval prompts use read-only tools only.
- WhatsApp site-manager evals write temporary site diary records and delete records created by the eval run.
- Results are saved locally in `.ai-eval-results/dashboard-*.json`.
- WhatsApp site-manager results are saved locally in `.ai-eval-results/whatsapp-site-manager-*.json`.
- `.ai-eval-results` is ignored by git.
- Real eval runs use thread IDs like `eval:dashboard-chat:<siteId>:<caseId>:<runId>`.
- WhatsApp site-manager eval runs use thread IDs like `eval:whatsapp-site-manager:<siteId>:<caseId>:<runId>`.

## Commands

Validate dashboard fixture/schema loading only:

```bash
npm run eval:ai:dashboard -- --dry-run
```

Validate WhatsApp site-manager fixture/schema loading only:

```bash
npm run eval:ai:whatsapp-site-manager -- --dry-run
```

Run validator unit tests:

```bash
npm test -- test/ai-evals/validators.test.ts
npm test -- test/ai-evals/whatsapp-site-manager-validators.test.ts
```

Run real dashboard AI evals after loading `.env`:

```bash
set -a
source .env
set +a
npm run eval:ai:dashboard
```

Run real WhatsApp site-manager AI evals after loading `.env`:

```bash
set -a
source .env
set +a
npm run eval:ai:whatsapp-site-manager
```

Run with optional LLM judge:

```bash
npm run eval:ai:dashboard -- --judge
npm run eval:ai:whatsapp-site-manager -- --judge
```

Useful optional env vars:

```env
AI_EVAL_AGENT_MODEL=gpt-5.4-mini
AI_EVAL_JUDGE_MODEL=gpt-4.1-mini
AI_EVAL_SLOW_TURN_MS=15000
AI_EVAL_WHATSAPP_PHONE=37129391891
```

Required env vars for real evals:

```env
RUN_AI_EVALS=true
OPENAI_API_KEY=...
DATABASE_URL=...
AI_EVAL_SITE_ID=...
AI_EVAL_USER_ID=...
```

WhatsApp site-manager preconditions:

- `AI_EVAL_USER_ID` must exist.
- The eval user's `lastSelectedSiteIdforWhatsapp` must equal `AI_EVAL_SITE_ID`.
- `AI_EVAL_SITE_ID` must have a site diary settings schema.
- The runner creates a temporary Meta `WhatsAppIdentity` for the eval run and mocks outbound Graph API calls, so it does not send real WhatsApp replies.

## How Results Work

Dashboard turns are checked by deterministic validators:

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

WhatsApp site-manager cases are checked by deterministic and heuristic validators:

- webhook route must return HTTP 200
- exactly one site diary record should be created
- saved record must belong to the eval site and user
- saved record must preserve the expected activity/location text signals
- saved worker count and duration must match the case expectation
- persisted audio URLs must not be expiring Meta `lookaside.fbsbx.com` URLs

Worker-count expectations for normal WhatsApp site-manager site diary rows:

- explicit worker counts win, for example `2 cilvēki`, `2 strādnieki`, `darbinieki: 2`, or `trīs strādnieki`
- completed work without an explicit worker count should infer `WorkersInvolved: 1`
- `WorkersInvolved: 0` is only valid when the source explicitly says zero workers
- this rule applies to the normal site diary meaning of `WorkersInvolved`; ZTC-specific payroll complexity is a separate overloaded use of the same DB field. Thats why its important to do extra impact check if deciding to edit this.

The WhatsApp JSON report includes:

- per-case selected record and created record IDs
- per-case `structuredSaveTrace` with raw structured LLM records, mapped DB rows, normalized insert rows, and persisted records
- deterministic status, heuristic score, and optional judge result
- requested model, actual provider model, token usage, and finish reason when available
- latency summary: `totalMs`, `averageMs`, `slowestCase`, `casesOverThreshold`

## What The Judge Is

The judge is an optional second model call that grades the answer as `pass`, `warn`, or `fail`. It is useful for fuzzy checks like grounding, tone, hallucination risk, and answer quality. It is slower and costs extra, so normal runs can skip it.

Use deterministic validators for hard rules. Use the judge for quality review.

## Adding A Case

For dashboard chat, add a new object in `dashboard-cases.ts`:

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

For WhatsApp site-manager, add a new object in `whatsapp-site-manager-cases.ts`:

```ts
{
  id: "latvian-floor-work-text",
  intent: "Verify a Latvian Meta text webhook is saved as a structured site diary record.",
  webhook: {
    // Sanitized Meta webhook payload.
  },
  expected: {
    requiredTextSignals: ["grīd", "3", "stāv"],
    workersInvolved: 2,
    timeInvolved: 3,
    minHeuristicScore: 0.75,
  },
}
```

For inferred worker count, use a case where work and hours are present but no worker count is stated:

```ts
{
  id: "latvian-wall-plaster-hours-implied-one-worker",
  intent: "Verify worker-count inference when no worker count is stated.",
  webhook: {
    // Sanitized Meta text webhook with body:
    // "Šodien apmestas sienas 2 stāvā, 4h"
  },
  expected: {
    requiredTextSignals: ["apmest", "sien", "2", "stāv"],
    workersInvolved: 1,
    timeInvolved: 4,
    minHeuristicScore: 0.75,
  },
}
```

The WhatsApp runner rewrites message IDs, sender identity, BSUID, and business phone number ID per run so checkpoint memory, idempotency, and identity resolution stay isolated.

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
- Update `whatsapp-site-manager-validators.ts` when saved-record matching is too strict or too loose.
- Add tests in `whatsapp-site-manager-validators.test.ts` for every WhatsApp validator change.

## Future Improvements

- Store token usage from LangChain responses in the JSON report.
- Add per-tool latency and tool-call counts.
- Add a cleanup script for eval checkpoint rows by `eval:dashboard-chat:` prefix.
- Add a cleanup script for eval checkpoint rows by `eval:whatsapp-site-manager:` prefix.
- Add a real audio webhook fixture for WhatsApp site-manager audio evals.
- Add dedicated flows for worker clock-in.
- Add a small HTML/CLI summary for comparing two report files before and after prompt/context changes.

Next WhatsApp site-manager edge cases to add:

- Explicit Latvian word-number worker count: `trīs strādnieki`, `četras personas`, or similar should map to the matching `WorkersInvolved` number.
- Multi-work single total duration: a message with two activities and one total `7h` should stay as one record unless the split is stated.
- Multiple records with separable quantities: a message with two clearly separated works, locations, hours, and worker counts should create exactly two records.
- No hours stated: completed work with location but no duration should infer worker count but leave `TimeInvolved` empty rather than guessing.
- Audio transcription path: Meta audio webhook should save the transcribed content, not persist a temporary Meta lookaside URL, and still extract workers/hours.
- Replace heuristic language checks with a small deterministic language detector or judge-only language rubric if the marker approach becomes noisy.
