# AI Eval Suites

Lightweight regression tests for real AI flows. These suites are opt-in because real runs call AI models and may write isolated LangGraph checkpoint rows or temporary eval records.

## Current State

- Jest currently has 150 passing tests across 31 suites and covers deterministic application and eval infrastructure behavior. Use the command output as the source of truth as this count grows.
- AI eval fixtures currently contain 23 cases / 27 evaluated interactions: 7 dashboard cases (10 turns), 12 WhatsApp site-manager cases (13 interactions), and 4 WhatsApp worker cases.
- Dashboard chat flow: `dashboard-chat` / `OrchestratingAgentV2`.
- WhatsApp site-manager flow: `whatsapp-site-manager` via the real Meta webhook route.
- WhatsApp worker flow: `whatsapp-worker` / `ClockinAgentForWorkerRoute` via the real Meta webhook route.
- Main language expectation: Latvian.
- One English compatibility case is kept intentionally.
- Dashboard eval prompts use read-only tools only.
- WhatsApp site-manager evals write temporary site diary records and delete records created by the eval run.
- Results are saved locally in `.ai-eval-results/dashboard-*.json`.
- WhatsApp site-manager results are saved locally in `.ai-eval-results/whatsapp-site-manager-*.json`.
- WhatsApp worker results are saved locally in `.ai-eval-results/whatsapp-worker-*.json`.
- `.ai-eval-results` is ignored by git.
- Real eval runs use thread IDs like `eval:dashboard-chat:<siteId>:<caseId>:<runId>`.
- WhatsApp site-manager eval runs use thread IDs like `eval:whatsapp-site-manager:<siteId>:<caseId>:<runId>`.
- WhatsApp worker eval runs use thread IDs like `eval:whatsapp-worker:<siteId>:<workerId>:<caseId>:<runId>`.

## Commands

### Command layers

| Goal | Command | Model/DB usage |
| --- | --- | --- |
| All safe local checks | `npm run test:all` | None |
| All Jest tests | `npm run test:unit` | None |
| Eval validator/runner unit tests | `npm run test:ai:validators` | None |
| Validate all eval fixtures | `npm run test:ai:dry-run` | None |
| Run all real deterministic evals | `npm run eval:ai:deterministic` | Models and eval database |
| Run supported judges plus worker deterministic evals | `npm run eval:ai:judge` | Agent models, judge model, and eval database |

`test:all` is intentionally safe for local development and CI: it runs Jest and all fixture dry-runs, but does not call models or write eval database rows. Real eval commands require the environment variables listed below. The worker suite has deterministic and heuristic checks but no LLM judge, so `eval:ai:judge` runs it without `--judge`.

Run the full safe local suite:

```bash
npm run test:all
```

Validate dashboard fixture/schema loading only:

```bash
npm run eval:ai:dashboard -- --dry-run
```

Validate WhatsApp site-manager fixture/schema loading only:

```bash
npm run eval:ai:whatsapp-site-manager -- --dry-run
```

Validate WhatsApp worker fixture/schema loading only:

```bash
npm run eval:ai:whatsapp-worker -- --dry-run
```

Run validator unit tests:

```bash
npm run test:ai:validators
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

Run real WhatsApp worker AI evals after loading `.env`:

```bash
set -a
source .env
set +a
npm run eval:ai:whatsapp-worker
```

Run with optional LLM judge:

```bash
npm run eval:ai:dashboard -- --judge
npm run eval:ai:whatsapp-site-manager -- --judge
```

Run every real eval suite without judges:

```bash
npm run eval:ai:deterministic
```

Run all supported judges and the worker deterministic suite:

```bash
npm run eval:ai:judge
```

Useful optional env vars:

```env
AI_EVAL_AGENT_MODEL=gpt-5.4-mini
AI_EVAL_JUDGE_MODEL=gpt-4.1-mini
AI_EVAL_SLOW_TURN_MS=15000
AI_EVAL_WHATSAPP_PHONE=37129391891
AI_EVAL_WORKER_ID=...
WHATSAPP_SITE_MANAGER_FAST_PATH_MODE=off
```

`WHATSAPP_SITE_MANAGER_FAST_PATH_MODE` accepts `off`, `shadow`, or `on`.
`shadow` runs fast-path extraction without persistence and then uses the legacy
agent; `on` persists only when the guarded extractor classifies the message as a
self-contained work report. Eval results include execution path, nested model
and tool calls, aggregate tokens, and phase timings.

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

WhatsApp worker preconditions:

- `AI_EVAL_WORKER_ID` must exist.
- The eval worker must be assigned to `AI_EVAL_SITE_ID`.
- The eval worker must have a phone number.
- `AI_EVAL_SITE_ID` must have a site diary settings schema.
- The runner creates a temporary Meta `WhatsAppIdentity` for the eval run and mocks outbound Graph API calls, so it does not send real WhatsApp replies or clock-in cards.
- The runner temporarily changes the eval worker clocked-in state per case, then restores the original state.

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
- exactly one site diary record should be created by default; `expectedRecordCount` can require multiple records, and cases with `shouldCreateRecord: false` require zero records
- saved record must belong to the eval site and user
- an `expectedDateISO` value requires the persisted diary date to match exactly
- saved record must preserve the expected activity/location text signals
- saved worker count and duration must match the case expectation
- persisted audio URLs must not be expiring Meta `lookaside.fbsbx.com` URLs

One WhatsApp site-manager case is inspection-only:

- it reads the real persisted `siteManager:${AI_EVAL_SITE_ID}:${AI_EVAL_USER_ID}` checkpoint thread
- it runs the shared `whatsapp-legacy` controlled-memory compactor locally
- it does not send a webhook, call a model, or create/delete diary records
- it warns instead of failing when no checkpoint history exists for that real thread

Worker-count expectations for normal WhatsApp site-manager site diary rows:

- explicit worker counts win, for example `2 cilvēki`, `2 strādnieki`, `darbinieki: 2`, or `trīs strādnieki`
- completed work without an explicit worker count should leave `WorkersInvolved` as `null`
- `WorkersInvolved: 0` is only valid when the source explicitly says zero workers
- this rule applies to the normal site diary meaning of `WorkersInvolved`; ZTC-specific payroll complexity is a separate overloaded use of the same DB field. That distinction requires an additional impact check before changing this behavior.

The WhatsApp JSON report includes:

- per-case selected record and created record IDs
- per-case `structuredSaveTrace` with raw structured LLM records, mapped DB rows, normalized insert rows, and persisted records
- deterministic status, heuristic score, and optional judge result, including advisory `improvements`
- requested model, actual provider model, token usage, and finish reason when available
- latency summary: `totalMs`, `averageMs`, `slowestCase`, `casesOverThreshold`

The WhatsApp worker JSON report includes:

- per-case webhook message ID, answer, status, thread ID, and `latencyMs`
- captured outbound Graph API message payloads, including mocked clock-in cards
- created worker diary record IDs and touched timelog IDs
- requested model, actual provider model, token usage, and finish reason when available
- latency summary: `totalMs`, `averageMs`, `slowestCase`, `casesOverThreshold`

## What The Judge Is

The judge is an optional second model call that grades the answer as `pass`, `warn`, or `fail`. It also returns an `improvements` array for concise advisory suggestions. These suggestions are report metadata only; they do not affect pass/fail status unless the judge status itself is `warn` or `fail`.

Use deterministic validators for hard rules. Use the judge for quality review.

## Comparing Two Model Runs

After running a suite with two different models (for example via an
`AI_EVAL_AGENT_MODEL` override), compare the two saved reports head-to-head
with `lib/ai-evals/compare-runs.ts`.

`compareEvalRuns(a, b)` takes two `NormalizedEvalRun` objects (from
`loadEvalReports()` / `normalizeEvalReport()` in `report-loader.ts`) and
returns a deterministic, unit-tested `NormalizedEvalComparison`:

- `tasks[]`: per-task scored matrix. Tasks are matched by `item.id`
  (`${caseId}:${turnIndex}` for dashboard multi-turn, `${caseId}:0` for
  WhatsApp single-record-per-case). Each row has status A/B, failed
  validators, judge status, latency, tokens, anomalies, and a `verdict`
  (`a` | `b` | `tie` | `incomparable` when a task is missing on one side).
- `aggregate`: per-run totals — tasks won/tied/incomparable, deterministic
  failures, judge failures/warnings, critical/warning anomalies, total and
  average latency, total tokens.
- `winner` + `winnerReason`: decided by a fixed tiebreak ladder:
  1. tasks won
  2. fewer deterministic failures
  3. fewer judge failures, then fewer judge warnings
  4. fewer critical anomalies, then fewer warning anomalies
  5. lower total latency
  6. lower total tokens
  7. tie

Tests live in `test/ai-evals/compare-runs.test.ts` (real-data invariants,
skips when fewer than two reports exist for a flow) and
`test/ai-evals/compare-runs-edge.test.ts` (synthetic edge cases covering
every tiebreak branch, always runs).

The `eval-report-analyst` opencode subagent (`.opencode/agents/`)
wraps `compareEvalRuns` and renders the scored matrix + winner with
short answer snippets. Invoke it with two run IDs after a pair of runs.

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
    shouldCreateRecord: true,
    requiredTextSignals: ["grīd", "3", "stāv"],
    workersInvolved: 2,
    timeInvolved: 3,
    minHeuristicScore: 0.75,
  },
}
```

For an ambiguous message that must not save anything, set `shouldCreateRecord` to false and assert clarification language:

```ts
{
  id: "ambiguous-reference-does-not-save",
  intent: "Verify an ambiguous reference asks for clarification without saving.",
  webhook: {
    // Sanitized Meta webhook payload.
  },
  expected: {
    shouldCreateRecord: false,
    requiredAnswerSignals: ["preciz|ko tieši"],
    forbiddenAnswerSignals: ["saglabāts veiksmīgi|saved successfully"],
  },
}
```

For an unknown worker count, use a case where work and hours are present but no worker count is stated. Set `expected.workersInvolved` to null:

```ts
{
  id: "latvian-wall-plaster-hours-without-workers",
  intent: "Verify workers remain empty when no worker count is stated.",
  webhook: {
    // Sanitized Meta text webhook with body:
    // "Šodien apmestas sienas 2 stāvā, 4h"
  },
  expected: {
    requiredTextSignals: ["apmest", "sien", "2", "stāv"],
    workersInvolved: null,
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

### Loosened answer-signal cases

Some WhatsApp site-manager answer-signal validators are intentionally loose
because listing every valid phrasing is brittle and the agent's wording can
vary. The cases below check that the agent behaves correctly (saves work,
refuses identity redirection, explains BIS status) without requiring exact
word combinations:

- `ambigious-bis-mention-in-task-decritpion`: no longer requires `"bis"` in the
  answer or a sentence limit — the fast-path receipt format is multi-line by
  design and does not mention BIS.
- `ambigious-bis-mention-in-task-decritpion-follow-up`: no longer requires the
  platform name `"worksrecorded|tīmek|pārlūk|portāl|web"` — the agent explains
  BIS connection steps, not the platform name.
- `bis-entry-how-to-guidance-only-no-bis`: accepts `"čat"` in addition to
  `"šeit|whatsapp|ziņ"`; no longer requires the platform name signal.
- `bis-entry-how-to-guidance-only-yes-bis`: accepts `"konfigurēts|sakārtots"`
  in addition to the active-connection signals; no longer requires the platform
  name signal.
- `trusted-context-rejects-identity-redirection`: now expects
  `shouldCreateRecord: false` — the agent's cautious refusal to save for another
  user is correct security behavior.

### Fast-path finish reasons

When `WHATSAPP_SITE_MANAGER_FAST_PATH_MODE=on` (the default), the site-manager
flow reports finish reasons like `fast-path`, `deterministic-save`, and
`deterministic-correction`. The report loader recognizes these as known finish
reasons and does not flag them as `unexpected-finish-reason` anomalies. Only
truly unexpected reasons (e.g. `content-filter`, `length`) are flagged.

### Multi-step follow-up cases

A WhatsApp site-manager case can include an optional `followUp` block that
sends a second webhook on the same eval thread after the first turn. This is
used for correction flows, context retention, and BIS follow-up guidance.

The follow-up case gets an auto-generated id `<caseId>-follow-up` and shares
the same thread and conversation context. The runner validates the follow-up
independently against its own `expected` block.

#### Correction path record resolution

When a follow-up triggers the correction path (`replace_last_site_diary_batch`),
the corrected records are resolved in this order:

1. **Structured save trace** — `getPersistedEvalRecordsFromTrace` reads records
   captured by `recordStructuredSaveTrace` during the correction operation.
2. **evalMetadata DB query** — `findCreatedRecords` queries by
   `evalMetadata.runId` + `evalMetadata.caseId` matching the follow-up.
3. **Correction audit fallback** — if both are empty, the runner queries
   `SiteDiaryCorrectionAudit` by `correctionMessageId` (the eval webhook
   message ID) and fetches the `newRecordIds` records. This handles the case
   where the correction persisted records without eval metadata (legacy path).

The correction path propagates `evalMetadata` from the run context to
`archiveAndReplaceSiteDiaryBatch`, so the corrected records carry the same
eval tags as normal saves. The structured save trace is also recorded so
trace-based lookup works. The audit fallback is a safety net for any future
regression.

## Future Improvements

- Store token usage from LangChain responses in the JSON report.
- Add per-tool latency and tool-call counts.
- Add a cleanup script for eval checkpoint rows by `eval:dashboard-chat:` prefix.
- Add a cleanup script for eval checkpoint rows by `eval:whatsapp-site-manager:` prefix.
- Add a real audio webhook fixture for WhatsApp site-manager audio evals.

Next WhatsApp site-manager edge cases to add:

- Explicit Latvian word-number worker count: `trīs strādnieki`, `četras personas`, or similar should map to the matching `WorkersInvolved` number.
- Multi-work single total duration: a message with two activities and one total `7h` should stay as one record unless the split is stated.
- Multiple records with separable quantities: a message with two clearly separated works, locations, hours, and worker counts should create exactly two records.
- No hours or workers stated: completed work with location should leave both `WorkersInvolved` and `TimeInvolved` empty rather than guessing.
- Audio transcription path: Meta audio webhook should save the transcribed content, not persist a temporary Meta lookaside URL, and still extract workers/hours.
- Replace heuristic language checks with a small deterministic language detector or judge-only language rubric if the marker approach becomes noisy.
