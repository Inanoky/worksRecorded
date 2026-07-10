# AGENTS.md

Project guide for opencode agents working in the `buvconsult` (worksRecorded)
codebase. Read this before editing.

## What this project is

`worksRecorded` is a Latvian-first construction & production site-diary SaaS.
Organizations get a flow module assigned in
`/dashboard/admin/flow-configs`; that flow module drives dashboard UI, site
diary behavior, WhatsApp site-manager / WhatsApp worker agents, and invoice
approval flows. Main user language is **Latvian**; keep AI answers in Latvian
unless a case explicitly allows English.

## Stack

- **Next.js 16** (App Router, `app/`), **React 19**, **TypeScript** (strict).
- **Prisma 6** + **Supabase Postgres** (`@vercel/postgres`, `pg`). Schema in
  `prisma/schema.prisma`. `postinstall` runs `prisma generate`.
- **LangGraph / LangChain** agents (`@langchain/langgraph`, `@langchain/openai`,
  `@langchain/community`, `@langchain/pinecone`) with Postgres checkpointing via
  `@langchain/langgraph-checkpoint-postgres`.
- **AI SDK** (`ai`, `@ai-sdk/openai`, `openai`).
- **WhatsApp Cloud API** (Meta webhooks) for site-manager and worker agents.
- **Tailwind 4**, **shadcn/ui** + Radix, **Biome** (formatter/linter), next-intl
  for i18n, Kinde auth, Stripe, Resend, UploadThing, Pinecone.
- **Tests:** Jest (unit, `jest.config.js`), Playwright (E2E, `playwright/`),
  custom AI eval suites in `test/ai-evals/`.

## Path aliases

`@/*` maps to project root (see `tsconfig.json`). `@prisma/client` maps to
`./node_modules/.prisma/client/default`. Prefer `@/lib/...`, `@/app/...`,
`@/flows/...`, `@/server/...` imports over relative paths.

## Directory map

```
app/                      Next.js App Router (routes, API routes, layout)
  [locale]/               Locale-scoped pages
  api/                    API routes (incl. /api/ai/chat, Meta webhooks)
  dashboard/              Dashboard UI
  clock-in/               Worker clock-in page
components/               Shared React components (shadcn + app components)
  client-flows/           Flow frontend registry (flow-frontend-registry.tsx)
docs/                     Architecture docs (READ THESE for AI/webhook context)
flows/                    Build-time flow modules (one folder per flow)
  <flow-key>/module.ts    FlowModuleDefinition (required)
  <flow-key>/frontend.ts  Dashboard/site-diary React components
  <flow-key>/backend.ts   WhatsApp/backend behavior (optional)
  README.md               6-step checklist for adding a flow
lib/                      Shared libs
  ai-evals/               local-gate + report-loader for eval runs
  flows/                  flow registry + runtime resolution
    registry.ts           FLOW_MODULES array (add new flow here)
  production-flow/        production flow config + runtime
  bis/                    BIS materials integration
  observability/          logging/observability
lib/flows/worker-runtime-server.ts   worker runtime
prisma/                   Prisma schema + migrations
scripts/                  One-off scripts (favicons, webhook SQL tests)
server/
  actions/                Server actions (BIS, Kinde, META, site-diary, ...)
  ai-flows/               LangGraph agent definitions + AI context policy
    agents/               OrchestratingAgentV2, site-manager, worker, specialists
    ai-context-policy.ts  Source of truth for the context policy table
    ai-models-settings.ts Model alias resolution
    controlled-memory.ts  Checkpoint compactor
    template-agents/      Prompt templates
supabase/                 Supabase config
test/                     Jest + Playwright tests
  ai-evals/               AI eval suites (see below)
  fixtures/               Test fixtures
messages/                 next-intl translation messages
i18n/                     i18n config
flows/                    Flow modules (see flows/README.md)
```

## Conventions

- **Formatter/linter:** Biome. Indent = **2 spaces**, quote style = **double**,
  organize imports on. Run `npx biome check --write` before committing. ESLint
  config also present (`eslint.config.mjs`); `npm run lint` runs `next lint`.
- **No comments** unless explicitly requested.
- **No emojis** in code or commit messages.
- Follow existing file style; do not introduce new dependencies without
  checking `package.json` first.
- Prefer named exports. Server actions live under `server/actions/`.
- Never log or commit secrets. `.env` is gitignored and must stay local.

## Commands

### App

| Goal       | Command                                    |
| ---------- | ------------------------------------------ |
| Dev server | `npm run dev` (Next + turbo, inspector on) |
| Build      | `npm run build`                            |
| Start prod | `npm run start`                            |
| Lint       | `npm run lint`                             |

### Tests

| Goal                             | Command                                 | Calls models? |
| -------------------------------- | --------------------------------------- | ------------- |
| All safe local checks            | `npm run test:all`                      | No            |
| Jest unit tests                  | `npm run test` / `npm run test:unit`    | No            |
| Eval validator unit tests        | `npm run test:ai:validators`            | No            |
| Validate all eval fixtures       | `npm run test:ai:dry-run`               | No            |
| Real dashboard evals             | `npm run eval:ai:dashboard`             | Yes           |
| Real WhatsApp site-manager evals | `npm run eval:ai:whatsapp-site-manager` | Yes           |
| Real WhatsApp worker evals       | `npm run eval:ai:whatsapp-worker`       | Yes           |
| All real deterministic evals     | `npm run eval:ai:deterministic`         | Yes           |
| Judge + worker deterministic     | `npm run eval:ai:judge`                 | Yes           |

**Safe local default:** `npm run test:all`. It runs Jest + fixture dry-runs and
never calls models or writes the eval DB. Prefer it for routine verification.

Real evals require `RUN_AI_EVALS=true` plus `OPENAI_API_KEY`, `DATABASE_URL`,
`AI_EVAL_SITE_ID`, `AI_EVAL_USER_ID` (and `AI_EVAL_WORKER_ID` for worker).
Load them with `set -a; source .env; set +a` before running.

## AI flow architecture

Source of truth: `docs/ai-context-engineering.md` and
`server/ai-flows/ai-context-policy.ts`.

LangGraph memory = Postgres checkpointers only (no LangGraph stores). Thread ID
formulas:

| Flow                           | Thread pattern                                        | Mode            |
| ------------------------------ | ----------------------------------------------------- | --------------- |
| `dashboard-chat`               | `orchestrating-agent-v2:<siteId-or-no-site>:<userId>` | write           |
| `whatsapp-site-manager`        | `siteManager:<siteId-or-no-site>:<userId>`            | write           |
| `whatsapp-worker`              | `<workerId>`                                          | write           |
| `structured-site-diary-save`   | nested tool/model run                                 | structured-save |
| `structured-worker-diary-save` | nested tool/model run                                 | structured-save |
| `site-diary-agent`             | `<siteId>_SiteDiaryAgent`                             | read-only       |
| `timesheets-agent`             | `<siteId>_Timesheets-agent`                           | read-only       |
| `bis-materials-agent`          | `<siteId>_BisMaterialsAgent`                          | read-only       |

Entry points:

- Dashboard chat: `POST /api/ai/chat` -> `OrchestratingAgentV2` (reads + writes
  dashboard tools, can delegate to specialist read agents).
- WhatsApp site manager: Meta webhook -> site-manager LangGraph agent. App
  context (`siteId`, `userId`, comment, audio URL) is injected into tool-call
  arguments before execution.
- WhatsApp worker: Meta webhook -> `ClockinAgentForWorkerRoute`. Context
  (`workerId`, `siteId`, timestamp, comment, audio URL) injected into tools.

Checkpoint reset (AI Context dashboard) deletes only `checkpoint_writes`,
`checkpoint_blobs`, then `checkpoints` for an allowed thread. It never deletes
business records, photos, timesheets, settings, workers, or site diary rows.

## AI eval suites (`test/ai-evals/`)

Three suites, each with a cases file, runner, and validators:

- **dashboard** (`dashboard-cases.ts`, `run-dashboard-eval.ts`, `validators.ts`):
  multi-turn chat cases. Validators: `requiredAll`, `requiredAny`, `forbidden`,
  `expectedLanguage` (`lv`/`en`/`same-as-user`), `requireClarification`,
  `minChars`. Thread IDs: `eval:dashboard-chat:<siteId>:<caseId>:<runId>`.
- **whatsapp-site-manager** (`whatsapp-site-manager-cases.ts`,
  `run-whatsapp-site-manager-eval.ts`, `whatsapp-site-manager-validators.ts`):
  sanitized Meta webhook payloads. Asserts record creation, ownership, date,
  text signals, worker count, duration, and that audio URLs are not expiring
  Meta `lookaside.fbsbx.com` URLs. Thread IDs:
  `eval:whatsapp-site-manager:<siteId>:<caseId>:<runId>`.
- **whatsapp-worker** (`whatsapp-worker-cases.ts`,
  `run-whatsapp-worker-eval.ts`, `whatsapp-worker-validators.ts`): webhook ->
  worker agent. Thread IDs:
  `eval:whatsapp-worker:<siteId>:<workerId>:<caseId>:<runId>`.

Results save to `.ai-eval-results/` (gitignored). Runner rewrites message IDs,
sender identity, BSUID, and business phone number ID per run to keep
checkpoint memory, idempotency, and identity resolution isolated.

### Worker-count rule for site diary rows

- Explicit worker counts win (`2 cilvēki`, `2 strādnieki`, `darbinieki: 2`,
  word-numbers like `trīs strādnieki`).
- Completed work without an explicit worker count leaves `WorkersInvolved` as
  `null` (not `0`).
- `WorkersInvolved: 0` is only valid when the source explicitly says zero.
- ZTC payroll overload of the same DB field is a separate concern; run an
  impact check before changing this behavior.

### Adding an eval case

Follow the patterns in `test/ai-evals/README.md`. Add a new object to the
relevant `*-cases.ts` file. For WhatsApp, use sanitized webhook payloads. For
context tests, use multiple `turns` sharing one eval thread.

When changing validators, always add tests in the matching `*.test.ts` file.

### Comparing two model runs

After running a suite with two different models (e.g. `AI_EVAL_AGENT_MODEL`
override), invoke the `eval-report-analyst` subagent with two run IDs to
compare them head-to-head. It uses `lib/ai-evals/compare-runs.ts`
(`compareEvalRuns(a, b)`) to produce a deterministic, unit-tested
`NormalizedEvalComparison`: per-task scored matrix (status, failed validators,
judge, latency, tokens, anomalies, verdict) and an aggregate winner decided
by a fixed tiebreak ladder (tasks won -> deterministic failures -> judge
failures/warnings -> critical/warning anomalies -> total latency -> total
tokens -> tie).

## Flow module checklist (adding a flow)

From `flows/README.md`:

1. Create `flows/<flow-key>/module.ts` exporting a `FlowModuleDefinition` with
   a unique `key`.
2. Add the module to `FLOW_MODULES` in `lib/flows/registry.ts`.
3. Export dashboard/site-diary components from
   `flows/<flow-key>/frontend.ts`.
4. Register frontend components in
   `components/client-flows/flow-frontend-registry.tsx`.
5. If the flow has WhatsApp/backend behavior, expose it from
   `flows/<flow-key>/backend.ts` and route it through the backend flow runtime.
6. Runtime uses `organizationId` and `siteId` from runtime context. Do not
   hardcode customer ids except as legacy fallbacks. Organization assignment
   lives in `FlowAssignment`.

## Security & guardrails

- Never edit or commit `.env`, `prisma/migrations/**`, or
  `.ai-eval-results/**`.
- Never run `prisma migrate`, `prisma db push`, `git push`, `git commit`, or
  destructive `rm -rf` without explicit user confirmation.
- Real AI evals can write isolated checkpoint rows and temporary diary records
  (WhatsApp suites delete records they create). Prefer `--dry-run` first.
- Do not send real WhatsApp replies: eval runners mock outbound Graph API
  calls. Preserve that mocking when extending runners.
- Latvian is the default expected language. Keep prompts, system prompts, and
  expected answer signals Latvian unless a case is explicitly English.

## Before committing

1. `npm run test:all` (Jest + fixture dry-runs) — must pass.
2. `npx tsc --noEmit` — no type errors.
3. `npm run lint` and/or `npx biome check --write`.
4. If you touched AI flows or validators, run `npm run test:ai:validators`.
5. If you touched eval fixtures, run `npm run test:ai:dry-run` for the affected
   suite.
6. Stage only intended files; never stage `.env` or `.ai-eval-results/`.
7. Commit messages: short, lowercase-first, imperative (match existing
   `git log --oneline` style). Example: `add latvian floor-work eval case`.
