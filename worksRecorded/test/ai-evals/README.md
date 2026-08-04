# AI Eval Suites

Lightweight regression tests for real AI flows. These suites are opt-in because real runs call AI models and may write isolated LangGraph checkpoint rows or temporary eval records.

## Current State

- Jest covers deterministic application and eval infrastructure behavior. Use the command output as the source of truth as this count grows.
- AI eval fixtures currently contain 31 cases / 37 evaluated interactions: 7 dashboard cases (10 turns), 18 WhatsApp site-manager cases (21 interactions), and 6 WhatsApp worker cases.
- Dashboard chat flow: `dashboard-chat` / `OrchestratingAgentV2`.
- WhatsApp site-manager flow: `whatsapp-site-manager` via the real Meta webhook route.
- WhatsApp worker flow: `whatsapp-worker` / `ClockinAgentForWorkerRoute` via the real Meta webhook route.
- Main language expectation: Latvian.
- One English compatibility case is kept intentionally.
- Dashboard eval prompts use read-only tools only.
- WhatsApp site-manager evals write temporary site diary records and delete records created by the eval run.
- WhatsApp site-manager image-caption evals also write temporary photo rows and delete photo rows created by the eval run.
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
| Image extraction Jest tests | `npm run test:image-extraction` | None |
| Eval validator/runner unit tests | `npm run test:ai:validators` | None |
| Validate all eval fixtures | `npm run test:ai:dry-run` | None |
| Validate critical eval fixtures | `npm run test:ai:critical-dry-run` | None |
| Real image extraction eval | `npm run test:image-extraction:real` | Image model and LangSmith if tracing is enabled |
| Run all real deterministic evals | `npm run eval:ai:deterministic` | Models and eval database |
| Run real critical evals only | `npm run eval:ai:critical` | Models and eval database |
| Run supported judges plus worker deterministic evals | `npm run eval:ai:judge` | Agent models, judge model, and eval database |
| Verify eval DB target | `npm run eval:ai:guard -- --flow whatsapp-site-manager` | Eval database only |
| Gate latest eval reports | `npm run eval:ai:gate` | None |
| CI real eval gate | `npm run eval:ci` | Models and eval database |

`test:all` is intentionally safe for local development and CI: it runs Jest and all fixture dry-runs, but does not call models or write eval database rows. Real eval commands require the environment variables listed below. The worker suite has deterministic and heuristic checks but no LLM judge, so `eval:ai:judge` runs it without `--judge`.

Real evals run against the normal application tables, but only through a dedicated eval organization/site/user/worker. The environment guard refuses to run unless `AI_EVAL_ALLOW_SINGLE_DB=true`, `AI_EVAL_ALLOWED_ORGANIZATION_ID` is set, and the configured eval site/user/worker all belong to that organization. The organization, site, user, and worker names must be clearly marked with `eval`, `test`, or `ai` unless `AI_EVAL_REQUIRE_MARKED_NAMES=false` is set.

Run the full safe local suite:

```bash
npm run test:all
```

Install the local pre-push hook once per machine:

```bash
npm run hooks:install
```

After installation, normal pushes run only safe AI eval checks and block the push if validators or fixtures are broken:

```bash
git push
```

This runs:

```bash
npm run prepush:ai:safe
```

Run real model/database evals before pushing when changing AI, WhatsApp, webhook, or site-diary behavior:

```bash
RUN_REAL_AI_EVALS_BEFORE_PUSH=true git push
```

This runs the safe checks, verifies the single-DB eval target, runs all real deterministic eval suites, and gates the latest reports. Critical failures block the push; warning-only results do not block. Use bypasses only deliberately:

```bash
git push --no-verify
SKIP_AI_PREPUSH=true git push
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

Validate the critical fixture slice only:

```bash
npm run test:ai:critical-dry-run
```

List or run a focused subset before spending time on a full real eval suite:

```bash
npm run eval:ai:whatsapp-site-manager -- --list --tag bis
npm run eval:ai:whatsapp-site-manager -- --dry-run --case latvian-explicit-zero-workers
npm run eval:ai:whatsapp-site-manager -- --dry-run --critical
npm run eval:ai:whatsapp-site-manager -- --case latvian-explicit-zero-workers
npm run eval:ai:whatsapp-site-manager -- --priority critical
npm run eval:ai:whatsapp-worker -- --tier smoke
```

Supported filters for dashboard, WhatsApp site-manager, and WhatsApp worker eval runners:

- `--case <id>` selects one or more case IDs. Comma-separated values and repeated flags are supported. Site-manager follow-up IDs like `<case-id>-follow-up` select their parent case.
- `--tag <tag>` selects cases carrying a tag such as `bis`, `worker-count`, `correction`, `clock-in`, or `no-save`.
- `--tier <smoke|regression|extended>` selects by eval tier.
- `--priority <critical|standard|extended>` selects by business-criticality. Critical cases are the must-not-break behaviors expected to work 100% of the time.
- `--critical` is shorthand for `--priority critical`.
- `--list` prints the selected cases, interactions, tags, tiers, and priorities without calling models or touching the database.
- `--dry-run` validates fixture loading, duplicate case IDs, duplicate interaction IDs, and filter matches without calling models or touching the database.

Run validator unit tests:

```bash
npm run test:ai:validators
```

Run safe image extraction tests:

```bash
npm run test:image-extraction
```

This runs only the mocked LangSmith/image-handler test and the mocked upload-to-material-extraction route test. It does not call models and does not import the real image extraction eval file.

Run the real material invoice image extraction eval after loading `.env`:

```bash
set -a
source .env
set +a
npm run test:image-extraction:real
```

This is the only image extraction test script that imports the real image extraction eval file. It calls the image extraction model against `test/fixtures/meta-webhook/material-invoice.jpg` and compares the extracted rows with `test/fixtures/meta-webhook/material-invoice.expected.json`. It prints a row-by-row, field-by-field comparison for `name`, `cost`, `invoiceNr`, `invoiceDate`, `costCode`, `quantity`, and `construction_material_id`, including missing and extra extracted rows. It does not write BIS records or send WhatsApp messages.

If this command prints warnings before the test result:

- `ts-jest` `globals` deprecation means Jest is still configuring ts-jest under `globals`. Keep the ts-jest options inside `jest.config.js` `transform` by passing them to `createDefaultPreset(...)`.
- LangSmith UUID v7 warnings mean a LangChain run was created with a UUID v4 or other custom ID. Image extraction traces should pass `runId: uuid7()` from `langsmith` in the runnable config so LangSmith receives a UUID v7 root run ID.

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

Run only critical cases across all eval suites:

```bash
npm run eval:ai:critical
```

Verify the eval target before calling models:

```bash
npm run eval:ai:guard -- --flow dashboard-chat
npm run eval:ai:guard -- --flow whatsapp-site-manager
npm run eval:ai:guard -- --flow whatsapp-worker
```

Gate the latest saved reports after a run:

```bash
npm run eval:ai:gate
npm run eval:ai:gate -- --flow whatsapp-site-manager
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
AI_EVAL_ALLOW_SINGLE_DB=true
OPENAI_API_KEY=...
DATABASE_URL=...
DIRECT_URL=...
AI_EVAL_ALLOWED_ORGANIZATION_ID=...
AI_EVAL_SITE_ID=...
AI_EVAL_USER_ID=...
```

The worker suite also requires:

```env
AI_EVAL_WORKER_ID=...
```

Optional debug mode:

```env
AI_EVAL_PRESERVE_RECORDS=true
```

When preserve mode is enabled, WhatsApp eval-created rows are left in the database and the runner prints created record ids. Preserve mode should be used only with the dedicated eval organization/site/user/worker.

GitHub Actions secrets for `.github/workflows/ai-evals.yml`:

```env
OPENAI_API_KEY
DATABASE_URL
DIRECT_URL
AI_EVAL_ALLOWED_ORGANIZATION_ID
AI_EVAL_SITE_ID
AI_EVAL_USER_ID
AI_EVAL_WORKER_ID
AI_EVAL_WHATSAPP_PHONE
LANGSMITH_API_KEY
```

Recommended repository variables:

```env
AI_EVAL_AGENT_MODEL
AI_EVAL_JUDGE_MODEL
LANGSMITH_PROJECT=AI/Evals
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

The workflow supports manual reruns with `workflow_dispatch` and a `suite` input (`all`, `dashboard`, `whatsapp-site-manager`, `whatsapp-worker`). It runs from the nested `worksRecorded/` app directory, uploads `.ai-eval-results/` as an artifact on every run, and appends a Markdown summary to the GitHub Actions run summary. The summary is generated by `npm run eval:ai:summary` and lists the newest report per selected flow, failed validators, judge conclusions, anomalies, and short input/output previews. GitHub Actions is the Node runtime for these evals; it imports the real webhook route and calls it directly with sanitized Meta webhook payloads. Outbound Meta Graph API calls are mocked by the runners, so evals do not send real WhatsApp replies.

When `LANGSMITH_API_KEY` is configured, the workflow enables both LangSmith and LangChain tracing aliases (`LANGSMITH_TRACING=true`, `LANGCHAIN_TRACING_V2=true`) and sends traces to `LANGSMITH_PROJECT` / `LANGCHAIN_PROJECT` (recommended: `AI/Evals`).

Report outputs:

- GitHub run summary: readable pass/fail table and failed task conclusions.
- `ai-eval-results` artifact: raw JSON reports plus `summary.md`.
- Local viewer: `/dev/ai-evals` reads local `.ai-eval-results/` files when the local gate allows it.

The real image extraction eval also requires:

```env
RUN_META_IMAGE_AI_EVAL=true
```

WhatsApp site-manager preconditions:

- `AI_EVAL_USER_ID` must exist.
- The eval user's `lastSelectedSiteIdforWhatsapp` must equal `AI_EVAL_SITE_ID`.
- `AI_EVAL_SITE_ID` must have a site diary settings schema.
- The runner creates a temporary Meta `WhatsAppIdentity` for the eval run and mocks outbound Graph API calls, so it does not send real WhatsApp replies.
- The runner mocks Meta image media lookup/download and UploadThing image upload for image-caption cases. It still goes through the real Meta webhook route and real site-manager AI flow, but does not depend on live Meta media or UploadThing.

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
- image-caption cases can assert `expectedPhotoCount` to verify the image was saved as a project photo
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
- per-case created photo IDs for image-caption webhook cases
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

For a Meta image webhook with a site-diary caption, use an image-shaped payload. The runner mocks the media URL, image bytes, and UploadThing upload, then validates that the caption still creates a normal site diary record:

```ts
{
  id: "latvian-image-caption-site-diary",
  intent: "Verify a Meta image webhook with a Latvian site diary caption saves the photo and creates a diary record from the caption.",
  webhook: {
    // Sanitized Meta image webhook with type: "image" and image.caption.
  },
  expected: {
    expectedPhotoCount: 1,
    requiredTextSignals: ["starpsien", "2", "stāv"],
    workersInvolved: 2,
    timeInvolved: 3,
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
