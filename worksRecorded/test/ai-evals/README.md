# AI Eval Suites

Lightweight regression tests for real AI flows. These suites are opt-in because real runs call AI models and may write isolated LangGraph checkpoint rows or temporary eval records.

## Current State

- Jest covers deterministic application and eval infrastructure behavior. Use the command output as the source of truth as this count grows.
- Use `--list` output for current fixture counts. The Ocelt suite includes eight reviewed diary/Forma2 cases and two derived scenarios. WhatsApp image cases require manual opt-in.
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
- Reviewed diary/Forma2 evals use a frozen corpus without database access and save both JSON and HTML, including `.ai-eval-results/diary-reviewed-latest.html`.
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
| Manual image extraction Jest tests | `npm run eval:ai:image-extraction` | None |
| Eval validator/runner unit tests | `npm run test:ai:validators` | None |
| Validate all eval fixtures | `npm run test:ai:dry-run` | None |
| List reviewed Ocelt diary cases | `npm run ai:list -- flow diary-reviewed` | None |
| Run all ten Ocelt diary/Forma2 evals | `npm run eval:ai:ocelt` | Models only; frozen corpus; no database access |
| Run only the two derived Ocelt scenarios | `npm run eval:ai:ocelt:scenarios` | Models only; frozen corpus; no database access |
| Review original messages and reference rows for three projects | `npm run eval:ai:diary-projects:review` | None; local HTML |
| Run the three-project reference benchmark | `npm run eval:ai:diary-projects` | Models only; frozen corpus; no database access |
| Run HUS K reference cases | `npm run eval:ai:sbstomme` | Models only; frozen corpus; no database access |
| Run Waterfront reference cases | `npm run eval:ai:waterfront` | Models only; frozen corpus; no database access |
| Generate HTML from saved reports | `npm run eval:ai:summary -- --flow whatsapp-site-manager` | None |
| Validate critical eval fixtures | `npm run test:ai:critical-dry-run` | None |
| Manual WhatsApp image evals | `npm run eval:ai:whatsapp-site-manager:images` | Models and eval database |
| Manual real image extraction eval | `npm run eval:ai:image-extraction:real` | Image model and LangSmith if tracing is enabled |
| Run all real deterministic evals | `npm run eval:ai:deterministic` | Models and eval database |
| Run real critical evals only | `npm run eval:ai:critical` | Models and eval database |
| Run supported judges plus worker deterministic evals | `npm run eval:ai:judge` | Agent models, judge model, and eval database |
| Verify eval DB target | `npm run eval:ai:guard -- --flow whatsapp-site-manager` | Eval database only |
| Gate latest eval reports | `npm run eval:ai:gate` | None |
| CI real eval gate | `npm run eval:ci` | Models and eval database |

`test:all` is intentionally safe for local development and CI: it runs Jest and all fixture dry-runs, but does not call models or write eval database rows. Real eval commands require the environment variables listed below. The worker suite has deterministic and heuristic checks but no LLM judge, so `eval:ai:judge` runs it without `--judge`.

The four WhatsApp image cases, including the material invoice, are marked `manualOnly`. Default, critical, deterministic, judge, CI and pre-push selections exclude them. Even explicit `--case` or `--tag image` selections require `--include-manual`; the `:images` command supplies it. Meta image Jest files also use a separate `jest.image-extraction.config.js` and are excluded from ordinary `test`, `test:unit` and `test:all` discovery. Their dedicated commands remain available; environment variables alone cannot add them to default discovery.

Simplified local aliases wrap the same runners and load `.env` automatically:

```bash
npm run ai:list -- critical
npm run ai:dry -- critical
npm run ai:run -- critical
npm run ai:list -- tag bis
npm run ai:run -- flow whatsapp-site-manager tag correction
```

Supported selectors are `critical`, `tag <name>`, `tier <smoke|regression|extended>`, `case <id>`, `--include-manual`, and `flow <dashboard|whatsapp-site-manager|whatsapp-worker|diary-reviewed|ocelt|diary-projects|sbstomme|waterfront|all>`. `flow ocelt` selects all ten Ocelt cases; `flow diary-reviewed` retains the eight reviewed examples. The three new project selectors require explicit selection and are not added to `flow all` paid runs. For real runs, `ai:run` verifies the selected eval target first, runs matching flows, then gates the newest selected reports.

Dashboard and WhatsApp webhook evals run against the normal application tables, but only through a dedicated eval organization/site/user/worker. Their environment guard refuses to run unless `AI_EVAL_ALLOW_SINGLE_DB=true`, `AI_EVAL_ALLOWED_ORGANIZATION_ID` is set, and the configured eval site/user/worker all belong to that organization. The organization, site, user, and worker names must be clearly marked with `eval`, `test`, or `ai` unless `AI_EVAL_REQUIRE_MARKED_NAMES=false` is set. The `diary-reviewed` frozen-corpus runner has its own guard requiring only `RUN_AI_EVALS=true` and `OPENAI_API_KEY`; it uses synthetic scope IDs and cannot persist diary records.

The shared default-construction diary pipeline performs extraction, checking, at most one targeted repair call, then a final check. It uses the same 180-second workflow deadline throughout. Repair replaces the former full extraction retry: accepted source-backed rows are locked, while the model receives editable row IDs, allowed fields, relevant project work candidates and source passages. It returns field patches or explicit row replacements/additions; application code merges them with the locked rows. Numeric evidence, candidate membership and source quotes are validated before the final check. Failure retains the existing partial-recovery/original-note behavior. `NoSorting` reports are not restructured by this model.

JSON/HTML reports include the `repair` stage, including rejected model patches and their validation error. LangSmith names the call `SiteDiaryTargetedRepair`; model usage is recorded under `site_diary_targeted_repair`, with separate repair and final-check timings. Extraction/checker/repair currently default to GPT-6.1 Sol Medium. Eval overrides use the existing extractor/checker model settings.

Each `checker` stage also includes `promptComposition`: named/versioned rule sections, their purpose, enabled project fields and inclusion/omission reasons. The same manifest appears in LangSmith model metadata as `diaryCheckerPrompt`; the system input contains the assembled sections with headings. See [checker prompt modules](../../flows/default-construction/backend/site-manager-agent/diary-prompts/README.md). Partial-recovery notes expose only a short review label and source facts; checker repair instructions remain diagnostic data.

`npm run eval:ai:ocelt -- --dry-run` lists all ten Ocelt cases; `RUN_AI_EVALS=true npm run eval:ai:ocelt` runs them and generates `diary-ocelt-latest.html`. Add `--trace` only when LangSmith uploads are intended. The two source-derived scenarios remain distinguishable from the eight reviewed examples through report provenance and per-case assignment metadata. Select only the new scenarios with `npm run eval:ai:ocelt:scenarios`. They use the frozen Ocelt configuration, resolve Forma2 only from configured work selections and perform no database writes or WhatsApp sends. Scenario-only reports use `ocelt-scenarios` run IDs and `diary-ocelt-scenarios-latest.html`. The conflicting-reference case explicitly expects two accepted works and a marked review note; its note may preserve the explicitly reported 1 kompl quantity or leave its measurement pair blank. Other cases continue to reject review rows by default.

Optional project speech mappings can be configured in `siteDiaryRecordsMap.otherSettings.defaultConstructionWorkAliases`; no database migration is required. `work` must exactly match an existing project `Works.DropDownOptions` value. These mappings are supplied to extraction, checking and targeted repair as vocabulary, without supplying quantities or labour. There is no alias editing UI yet.

```json
{
  "entries": [
    { "alias": "zilā truba", "work": "1.1 Ūdensvada OD63 montāža" }
  ]
}
```

Repair candidates prioritize exact position references, compatible dimensions, work wording and configured speech mappings. A configured category explicitly named in the checker's repair plan is retained even in a crowded catalog; a dimensional contradiction still excludes it. Slang is not learned automatically from an unverified model output.

### Original-message benchmark across three projects

`eval:ai:diary-projects` runs the shared default-construction extractor, checker and targeted repair against frozen original messages and current reference rows from three independently scoped projects. It does not run the WhatsApp router, transcription, persistence or outbound messaging. The model receives the source message, received date, project language, field configuration, work options and that project's Forma2 catalog. It never receives the expected rows or reference comments. No Codex SDK implementation is included yet; these inputs and validators can be reused for a later engine comparison.

The snapshot was audited read-only on 2026-11-20:

| Organization | Project selector | Original-message period | Scored messages | Reference rows | Forma2 positions | Additional pairs for review |
| --- | --- | --- | --- | --- | --- | --- |
| Ocelt | `ocelt` | 2026-11-10–2026-11-13 | 8 | 16 | 52 | 10 |
| SBSTOMME | `sbstomme-hus-k` | 2026-09-16–2026-10-16 | 14 | 26 | 21 | 22 |
| StoneAndTree | `stoneandtree-waterfront` | 2026-08-17–2026-09-11 | 9 | 16 | 0 | 24 |

There were no HUS K or Waterfront messages in the preceding calendar month. Their windows therefore use the latest available 30 days of project activity. The periods above include review candidates; individual case IDs retain their actual source dates.

All 31 scored inputs are complete standalone `SiteDiarySaveBatch.originalText` messages after removing the author prefix. Batch, raw text, redacted input and reference row fingerprints preserve provenance without committing production identity IDs. `ocelt-source-audit.json` separately verifies all eight existing Ocelt messages and all 16 expected rows against their exact batches; these are not fragments of the larger multi-work messages. The legacy `eval:ai:ocelt` command still includes its two synthetic scenarios. The new project benchmark includes only the eight real Ocelt messages.

Reference rows preserve their stored date, work category, quantity, labour, location and comment. Forma2 expectations distinguish `stored-allocation` from `journal-work-selection` (the current configured work-to-position binding). A configured binding is not evidence of an independently reviewed allocation. HUS K's 21 positions cannot match Ocelt positions because snapshot IDs are scoped per project. Waterfront has no Forma2 catalog; its assertions require configured work categories and null Forma2 IDs. The project benchmark also disables the extra offline automatic Forma2 matcher used by the older reviewed suite, so it cannot conceal an extractor/checker assignment failure.

Matching is independent of row order. It checks work identity, date, amount/unit, worker count, duration, explicitly testable locations, review state and configured comment signals. Quantity checks preserve null versus zero and accept only explicit alternatives such as a known catalog unit with an unknown amount. Reports include matched/missing/unexpected works and field correctness per case and project. A missing work counts as missing field coverage; these are not independent claims that its source date or number was misread. The benchmark does not automatically judge the full semantic quality of paraphrased comments. Original reference comments are shown for human comparison, and exact reference wording is not required.

The 56 additional pairs remain visible in the corpus review but are excluded from scoring. They include missing current rows, correction chains, unspoken 10-hour/zero-quantity defaults and unresolved delivery-versus-installation splits. Existing corrected records are useful references, but an import method labelled `manual` is not proof of human approval. Source-backed cases may still expose catalog disagreements: for example, HUS K reports filigran slabs in pieces while its current catalog position uses square metres. Keep the reported pieces in the reference; do not invent an area conversion to make the test pass. Review the catalog or project rule separately.

```bash
npm run eval:ai:diary-projects:review
npm run eval:ai:diary-projects -- --dry-run
npm run eval:ai:sbstomme -- --list
npm run eval:ai:waterfront -- --dry-run
RUN_AI_EVALS=true npm run eval:ai:diary-projects
RUN_AI_EVALS=true npm run eval:ai:diary-projects -- --project ocelt
RUN_AI_EVALS=true npm run eval:ai:sbstomme
RUN_AI_EVALS=true npm run eval:ai:waterfront
```

The runners load `.env` locally and require `OPENAI_API_KEY` for real calls. No database credentials are needed for this benchmark. Tracing is off by default; add `--trace` only when the selected organizations' prompts, outputs and diagnostics are intended for LangSmith upload. The corpus review is `.ai-eval-results/diary-project-corpus-review.html`; real runs save JSON and HTML plus `diary-projects-<all|project-key>-latest.html`. Reports identify the engine, project catalog/input fingerprints, assignment mode and actual model settings. Safe `test:ai:dry-run` validates all three frozen corpora without model calls; no new paid run is automatic.

`eval:ai:diary-projects:review` also exports `.ai-eval-results/diary-project-original-messages.txt` and `diary-project-comparison-cases.json`. The text lists all 31 original inputs verbatim with received dates, expected work dates and reference rows. A separate appendix contains the two derived Ocelt scenarios. The JSON keeps model inputs separate from expected answers, includes each project's context snapshot and uses `caseId` to join future extractor results. Derived scenarios retain their own legacy catalog context. Catalog/category conflicts are labelled without changing reference values; the 56 unscored review candidates are absent from these two exports. Generating the overview makes no model calls or database requests.

To refresh from an authorized, private read-only export, curate exact batch fingerprints in `test/fixtures/ai-evals/project-diary-selection.json`, then import into a new directory for review:

```bash
npm run eval:ai:diary-projects:import -- --input /private/tmp/project-export.json --output-dir /private/tmp/new-diary-corpora
```

The importer accepts the Supabase CLI `{ "rows": [...] }` export shape or an array of `DiaryProjectSnapshot` objects, validates site fingerprints, remaps position IDs and refuses to overwrite existing fixture files. It performs no database queries or model calls. Keep the raw export outside the repository, inspect the generated HTML and fixture diff, and review ambiguous references before changing the scored selection.

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
npm run eval:ai:image-extraction
```

This runs only the mocked LangSmith/image-handler test and the mocked upload-to-material-extraction route test. It does not call models and does not import the real image extraction eval file.

Run the real material invoice image extraction eval after loading `.env`:

```bash
set -a
source .env
set +a
npm run eval:ai:image-extraction:real
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
- `ai-eval-results` artifact: raw JSON reports, HTML reports generated by `eval:ai:summary`, and `summary.md`.
- Local viewer: `/dev/ai-evals` reads local `.ai-eval-results/` files when the local gate allows it.

Generate standalone HTML from the newest saved report for a flow without calling models:

```bash
npm run eval:ai:summary -- --flow whatsapp-site-manager
npm run eval:ai:summary -- --flow diary-reviewed
```

Each HTML file is saved beside its source JSON with the same basename and can be opened directly in a browser. It includes inputs, outputs, deterministic failures, model usage and available structured-save traces. The reviewed diary runner writes these files automatically even when an eval case fails.

WhatsApp image fixtures are copied to `.ai-eval-results/media/` and listed in the report's `localMedia` manifest. HTML reports preview these local files. Database rows and checkpoints contain a short eval URL; the fetch mock replaces registered image input URLs with local file bytes only for model inference. No public image hosting is required, and the mock still prevents real WhatsApp replies.

The shared extractor preserves verified source calculations and can recover a partially valid batch after checker review. Every source event must be covered and each row must have an exact source quote and a separate checker verdict. Accepted rows keep their structure; unresolved rows become `Piezīmes` with `Jāpārskata` and per-row `diaryQuality.status=needs_review` metadata. Eval fixtures fail on unresolved review rows unless they explicitly set `allowNeedsReview: true`.

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

## Pārskatītie Ocelt dienasgrāmatas/Forma2 piemēri

`diary-reviewed` ir atsevišķa regresiju kopa esošajam `site-diary-extractor` un `site-diary-checker`, kam seko pašreizējā Forma2 piesaistes loģika. Tā neizmanto jauno Agents SDK aģentu. Avots ir lietotāja norādītie manuāli izlabotie Ocelt projekta 2026. gada 10.–13. novembra ieraksti, nolasīti ar Supabase CLI tikai lasīšanas režīmā 16. novembrī.

Fiksētā datu kopa atrodas `test/fixtures/ai-evals/ocelt-reviewed-diary.json`: 8 pieprasījumi, 16 sagaidāmie ieraksti un 52 projekta Forma2 pozīcijas. No ziņām noņemts autora vārda prefikss; lietotāju, WhatsApp, BIS un biznesa ierakstu ID nav pārnesti. Avotu sasaisti saglabā neatgriezeniski nospiedumi. `method: manual` pats par sevi netiek uzskatīts par cilvēka apstiprinājuma pierādījumu; šīs kopas pamats ir lietotāja norāde par izlabotajiem datiem.

| Piemērs | Sagaidāmais rezultāts |
| --- | --- |
| 10.11. četri zemes darbi, iesniegti 12.11. | 2.11: 73,26 m³; 2.12: 73,26 m³; 2.13: 6,60 m³; 2.14: 63,14 m³. Datums paliek 10.11. |
| 12.11. aka, caurule un četri zemes darbi | 2.1: 1 kompl.; 2.4: 22,09 m; 2.11: 73,56 m³; 2.12: 73,56 m³; 2.13: 6,63 m³; 2.14: 63,40 m³ |
| PE100 OD63 ar tranšejas metodi | 1.1, 60,87 m |
| Dzelzsbetona skataka DN1000 | 1.4; daudzums un mērvienība paliek null, jo ziņā nav skaitliska apjoma |
| PP skataka DN600 | 2.1, 1 kompl. |
| PP kanalizācijas caurule D200 | 2.4, 69,85 m |
| Tranšejas rakšana | 2.11, 232,55 m³ |
| Blietēta smilts-grants aizbēršana | 2.14, 200,56 m³ |

Sākumā apzināti izlaisti neskaidrie piemēri: OD220/D200 neatbilstība, vienu darba stundu atkārtošana vairākos ierakstos, materiālu/specifikāciju trūkums un manuāli norādītais četru dienu sadalījums. Vienīgais 11.11. pašreizējais ieraksts ir daļa no šī sadalījuma, tāpēc atsevišķs 11.11. avota pieprasījums šajā sākotnējā kopā nav izdomāts.

Validatori prasa precīzu ierakstu skaitu un vienu pret vienu atbilstību neatkarīgi no rindu secības. Katrai rindai pārbauda datumu, daudzumu ar pielaidi mazāku par 0,005, mērvienības nozīmi, darbiniekus, stundas un konkrēto Forma2 pozīcijas ID. `set`/`kompl` un `pcs`/`gab.` ir atbalstīti skaita mērvienību sinonīmi. Null netiek pielīdzināts nullei. Cilvēka komentārs un vieta glabājas atsaucei; komentāra stilam un vietas izvēlei šīs kopas sākumā nav jābūt burtiski identiskiem.

Palaišana bez modeļiem un datubāzes:

```bash
npm run eval:ai:ocelt -- --dry-run
npm run ai:list -- flow diary-reviewed
npm run ai:dry -- flow diary-reviewed tag ocelt
npm run test:ai:validators
npm run test:ai:dry-run
```

Dzīvam Ocelt salīdzinājumam vajag tikai `RUN_AI_EVALS=true` un `OPENAI_API_KEY`. Šī kopa nelasa datubāzi un neizmanto `AI_EVAL_SITE_ID`, `AI_EVAL_USER_ID` vai `AI_EVAL_ALLOW_SINGLE_DB`; plūsmas kontekstā padod sintētiskus `eval:` identifikatorus. Projekta shēmu un mērvienības tā ņem no fiksētās kopijas. Pareizie ieraksti un to vēsturiskās piesaistes netiek ievietoti modeļa kontekstā. Extractor/checker darbojas ar `persist: false`, kas ir atļauts tikai skaidri norādītā eval kontekstā. Netiek rakstīti dienasgrāmatas ieraksti, kontrolpunkti vai Forma2 dati un netiek sūtītas WhatsApp atbildes. Rezultātu JSON veido tikai pēc reālas izpildes, un tas ir nolasāms esošajā `/dev/ai-evals` sadaļā. CLI servera moduļu ielādei vajadzīgs Node 22.15+.

Katra izpilde veido JSON, HTML ar to pašu faila nosaukumu un `.ai-eval-results/diary-reviewed-latest.html`. HTML redzams sākotnējais pieprasījums, sagaidāmās un ģenerētās rindas, konkrētās kļūdas un modeļu izsaukumu dati. Atskaiti saglabā arī tad, ja tests neiziet.

```bash
RUN_AI_EVALS=true npm run eval:ai:ocelt -- --case ocelt-1112-six-sewer-activities
RUN_AI_EVALS=true npm run eval:ai:ocelt
open .ai-eval-results/diary-reviewed-latest.html
```

Extractor modeļa salīdzinājumam var norādīt `AI_EVAL_AGENT_MODEL` un `AI_EVAL_REASONING_EFFORT` (`low`, `medium`, `high`). Tie attiecas arī uz extractor labošanas izsaukumiem. Checker var atsevišķi izvēlēties ar `AI_EVAL_CHECKER_MODEL` un `AI_EVAL_CHECKER_REASONING_EFFORT`; bez tiem tas izmanto produkcijas noklusējumu `gpt-6.1-sol` ar `medium`. Izvēlētais checker modelis darbojas arī atkārtotajā pārbaudē pēc labošanas. GPT-6.1 Sol izsaukumos izmanto Responses API. Abu modeļu iestatījumus saglabā rezultātu JSON.

```bash
RUN_AI_EVALS=true AI_EVAL_AGENT_MODEL=gpt-6.1-sol AI_EVAL_REASONING_EFFORT=high npm run eval:ai:ocelt
```

Abiem modeļiem GPT-6.1 Sol High:

```bash
RUN_AI_EVALS=true AI_EVAL_AGENT_MODEL=gpt-6.1-sol AI_EVAL_REASONING_EFFORT=high AI_EVAL_CHECKER_MODEL=gpt-6.1-sol AI_EVAL_CHECKER_REASONING_EFFORT=high npm run eval:ai:ocelt
```

Pilnas izpildes apskatei LangSmith pievieno `--trace`:

```bash
RUN_AI_EVALS=true AI_EVAL_LANGSMITH_PROJECT=AI-Evals AI_EVAL_AGENT_MODEL=gpt-6.1-sol AI_EVAL_REASONING_EFFORT=high AI_EVAL_CHECKER_MODEL=gpt-6.1-sol AI_EVAL_CHECKER_REASONING_EFFORT=high npm run eval:ai:ocelt -- --trace
```

Vajadzīgs `LANGSMITH_API_KEY` vai `LANGCHAIN_API_KEY`. Bez `--trace` šī palaidēja izsekošana paliek izslēgta. Katram gadījumam LangSmith veido vienu `DiaryReviewedEval: <case-id>` izpildi ar extractor/checker, iespējamo labošanas ceļu, Forma2 piesaisti un gala validatoru rezultātu. CLI, JSON un HTML rāda konkrētās izpildes saiti; palaidējs pirms beigām sagaida izsekošanas nosūtīšanu. `AI_EVAL_LANGSMITH_PROJECT` izvēlas projektu, nemainot `.env`. Izsekošana nemaina modeļa ievadi, sagaidāmos rezultātus vai datubāzes rakstīšanas aizliegumu.

JSON un HTML sadaļā `stages` saglabājas sākotnējā un labotā izvilkšana, normalizētās rindas, katrs checker lēmums un gala atteikuma iemesls. Šie dati ir diagnostikai un nemaina sagaidāmos rezultātus vai saglabāšanas noteikumus. Modeļu metrikā uzskaita arī atkārtoto checker izsaukumu.

Site-manager AI plūsmai kopā ir 180 sekundes no webhook saņemšanas; maršrutēšana, ekstraktors, checker un labošanas izsaukumi dala vienu budžetu. Katrs nākamais izsaukums saņem tikai atlikušo laiku. Datubāzes saglabāšana un WhatsApp atbildes nosūtīšana nav modeļa taimauta daļa. Pēc taimauta netiek sākta vēl viena modeļa izpilde. Ja jaunu darba atskaiti nevar droši strukturēt, īstā plūsma saglabā sākotnējo tekstu kā `Piezīmes` ar `needs_review`. Fiksētajā evalā identisku piezīmi tikai sagatavo atmiņā: `note_fallback` posmam ir `persisted: false`, un Forma2 matcher vairs netiek palaists. Tests joprojām neiziet, ja sagaidīts strukturēts darba ieraksts; avota saglabāšana netiek sajaukta ar precīzu ekstrakciju. Jautājumi, neskaidras atbildes un iepriekšējo ierakstu labojumi šādi netiek pārvērsti jaunās atskaitēs.


Šis budžets attiecas uz esošo `site-manager-agent` ekstraktora/checker plūsmu. Atsevišķais Agents SDK pilots (`diary-intake`) un Forma2 automātiskās piesaistes serviss izmanto savus limitus. SDK pilotu izvēlas tikai pēc ieslēgta servera iestatījuma, atļautā projekta, projekta pilota konfigurācijas un atļautā lietotāja/telefona; parastās WhatsApp eval izpildes pilotu apiet. Audio lejupielāde un transkripcija notiek pirms šīs ekstrakcijas; tās var patērēt webhook budžetu, un šīs apstrādes savs laika ierobežojums šeit netiek mainīts.

| Situācija esošajā dienasgrāmatas plūsmā | Rezultāts |
| --- | --- |
| Ekstrakcija un checker pieņem visus darbus | Saglabā pārbaudītās rindas; apstiprinājumu veido bez vēl viena modeļa izsaukuma. |
| Checker norāda droši labojamus nepamatotus skaitļu laukus | Piemēro ierobežotu deterministisku labojumu. |
| Vajadzīgs semantisks labojums | Atļauts viens atkārtots ekstraktors un checker tajā pašā budžetā. |
| Tikai daļa rindu ir droši pamatota un pierādīts pilns ziņas pārklājums | Saglabā pieņemtās rindas; pārskatāmo daļu saglabā piezīmēs ar tās avota fragmentu. |
| Jaunas atskaites ekstraktors/checker neizdodas vai iestājas taimauts | Ja izpildās avota un konteksta drošības nosacījumi, saglabā vienu sākotnējā teksta piezīmi ar `needs_review`. |
| Jautājums, neskaidra atbilde vai vēsturiska ieraksta labojums | Nerada jaunu rezerves piezīmi; izmanto atbildes, precizējuma vai aizsargātā labojuma ceļu. Taimauts pirms saglabāšanas rīka dod taimauta atbildi. |
| Nav uzticama lietotāja/projekta konteksta vai neizdodas ielādēt konfigurāciju | Nesaglabā datus ar izdomātu kontekstu. |
| Neizdodas datubāzes saglabāšana | Neziņo par veiksmīgu saglabāšanu un nesāk otru saglabāšanu kā rezerves mēģinājumu. |

Balss labojumi pēc transkripcijas izmanto tos pašus `start_site_diary_correction` un `replace_last_site_diary_batch` rīkus kā teksta labojumi. Labošanas ekstraktors saņem arī pašreiz saglabātās rindas kā pamatu, lai neatceltu agrākus labojumus, un norādi mainīt tikai pieprasītos faktus. Pirms arhivēšanas pārbauda, ka labojuma mērķa atskaite joprojām ir tā pati, kura izmantota AI apstrādē. `latvian-spoken-correction-without-command` pārbauda dabisku balss transkripta frāzi bez komandas “labot”; audio ceļa tests atsevišķi pārbauda sākotnējās ziņas atbildes konteksta saglabāšanu. Skaitļu pierādījumu pārbaude atpazīst arī latviski vārdos izteiktus veselus skaitļus, piemēram, “desmit gabali” un “divdesmit četri metri”; oriģinālais transkripts netiek pārrakstīts. Konteksta skaitļi par darbiniekiem, stundām vai materiāla dimensijām joprojām netiek pieņemti par būvapjomu. Pilnā pakete joprojām tiek ģenerēta un pārbaudīta no jauna; atsevišķu lauku deterministisks patch rīks šeit vēl netiek ieviests.

Dažādu klientu pārbaudes izmanto izvēlētā projekta konfigurāciju ar atšķirīgiem darbu lauku nosaukumiem, kategorijām un mērvienībām. Jumta m2 un cauruļu m piemēros lokāli pārbaudīta gan pieņemta ekstrakcija, gan sākotnējā teksta piezīme pēc taimauta. Tas pārbauda kopīgo mehānismu; katra klienta reālo datu precizitātei jāpievieno attiecīgā klienta piemēri.

`eval:ai:ocelt` izmanto to pašu `node --import ... --import tsx` palaišanas kārtību kā `eval:ai:dashboard` un `eval:ai:whatsapp-site-manager`. Tas tieši izsauc `run-reviewed-diary-eval.ts` ar `--tag ocelt`, un papildu `--case`, `--list` vai `--dry-run` argumentus var padot aiz `--`. `eval:ai:diary-reviewed` paliek pieejams visai pārskatīto ierakstu kopai; `ai:run` ir izvēles apvalks, kas papildus pārbauda jaunākās atskaites rezultātu.

Produkcijas ekstraktora un pārbaudītāja modeļus nosaka `flows/default-construction/backend/site-manager-agent/diaryModelSettings.ts`: abiem `gpt-6.1-sol`, `medium`, Responses API. Tie ir koda noklusējumi, kas produkcijā stājas spēkā pēc izvietošanas. `AI_EVAL_AGENT_MODEL`, `AI_EVAL_REASONING_EFFORT`, `AI_EVAL_CHECKER_MODEL` un `AI_EVAL_CHECKER_REASONING_EFFORT` maina tikai testu izpildi. WhatsApp maršrutēšanas modeļa konfigurācija paliek `server/ai-flows/ai-models-settings.ts`.

Produkcijas kļūmju atkārtošanai ir atsevišķa kopa; tā nemaina manuāli pārskatīto Ocelt vēsturisko datu kopu:

```bash
npm run eval:ai:diary-production -- --dry-run
RUN_AI_EVALS=true AI_EVAL_LANGSMITH_PROJECT=AI-Evals npm run eval:ai:diary-production -- --trace
open .ai-eval-results/diary-production-latest.html
```

Šie četri piemēri ietver divas 17. novembra produkcijas transkripcijas un divas skaidras regresijas darba laika piesaistei. Sagaidāmie rezultāti ir testa prasības, nevis apgalvojums, ka tos jau manuāli pārskatījis klients. Saglabāti 101 produkcijas darbu izvēles varianti, angļu vispārīgās kategorijas un Forma2 mērvienību konfigurācija; vēsturiskās atskaites aizvietotas ar testa datiem, konteksts ierobežots līdz 12 000 rakstzīmēm. Atskaitē ir LangSmith saites un ekstraktora, normalizācijas, pārbaudītāja un labošanas posmi. Šī kopa pārbauda piesaisti Forma2 ar konfigurēto darba izvēli; atsevišķais automātisko Forma2 piesaistes ieteikumu modelis šajā kopā netiek palaists. Nav datubāzes lasījumu, ierakstu vai WhatsApp atbilžu.

Kopējais darba laiks bez sadalījuma tiek saglabāts vienreiz atsevišķā piezīmē. Atsevišķi aprakstītos darbus saglabā savās rindās; konkrētam darbam skaidri piesaistītos darbiniekus un ilgumu saglabā uz šī darba rindas. Pārbaudītājs saņem pilnu darbu un mērvienību katalogu arī tad, ja vēsturiskais konteksts ir saīsināts, un pēc labošanas redz savu iepriekšējo vērtējumu. Avota citātu pārbaude pieļauj pieturzīmju un atstarpju atšķirības, bet nemaina vārdus, skaitļus, mērvienības vai identifikatorus. Vairākas avota vietas jānorāda kā atsevišķi `sourceSpans`; kļūdaina saite uz avotu vienā rindā pati par sevi neatceļ pārējās pamatotās rindas.

Pilnajiem `whatsapp-site-manager` evaliem izolētās datubāzes vides pārbaude paliek spēkā. Ja `AI_EVAL_USER_ID` pieder citai organizācijai nekā `AI_EVAL_ALLOWED_ORGANIZATION_ID` vai lietotājam nav izvēlēts testa projekts WhatsApp kontekstā, vispirms jānorāda atbilstošs testa lietotājs. Šāda neatbilstība netiek apieta ar Ocelt fiksētās kopas palaidēju.

TDD cikls: paturēt sagaidāmos rezultātus fiksētus → palaist vienu skaidru gadījumu ar esošo plūsmu → izlabot konkrēto izgāzušos soli → atkārtot šo gadījumu un pēc tam visus 8. Ja modelis kļūdās, nemainīt pareizo atbildi, lai tests kļūtu zaļš. Gold datu maiņai vajadzīga jauna avota vai cilvēka labojuma pārbaude. Lokālie validatoru testi apzināti maina apjomu, datumu, mērvienību un pozīciju, kā arī izlaiž/dublē rindas, lai pierādītu, ka šādas regresijas tiek noraidītas. Šo testu zaļš rezultāts pats par sevi nav reālā modeļa precizitātes mērījums.
