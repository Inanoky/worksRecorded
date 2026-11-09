# Production performance journey

This read-only Playwright suite measures an authenticated customer moving from
the project list to a project diary, then between the diary and warehouse. It
also measures browser history and hard reloads. It does not create, update, or
delete application data.

## One-time authentication

Use a dedicated production test user with access to the test project:

```sh
PERF_BASE_URL=https://your-production-domain.example npm run perf:capture-auth
```

Complete Kinde login in the opened browser. The saved session is gitignored.

## Run the journey

Named targets keep the flow, project, scenario, expected project API, run count,
and cycle count consistent. The first canonical target is
`default-construction-core`, which measures the Pļavas iela 2 project using the
`construction-project/bootstrap` API for its cold diary opening. A full baseline uses five fresh browser contexts
and three diary/warehouse cycles per context:

```sh
PERF_RUN_LABEL=baseline-v1-2026-11-08 \
npm run perf:benchmark:default-construction
```

Use one visible run as a smoke test before the headless baseline:

```sh
PERF_RUNS=1 \
PERF_CYCLES=1 \
PERF_RUN_LABEL=smoke-2026-11-08 \
npm run perf:benchmark:default-construction -- --headed
```

Named target definitions live in `benchmark-targets.ts`. The test fails when
the configured project does not produce a successful request to its expected
project API, preventing a report from being mislabeled with the wrong flow or
project implementation. Manual `PERF_BASE_URL` and `PERF_PROJECT_ID` runs remain
available through `npm run perf:prod` for investigation outside canonical
benchmarks.

Timestamped or labelled JSON and Markdown results are written under
`.performance-results/`, alongside the Playwright HTML report. Canonical files
use `benchmark-<benchmark-id>-<run-label>.json` and `.md`; both formats include
the benchmark ID, flow key, scenario, project name and ID, and expected API.

The JSON stores API, document, fetch, XHR, RSC, failed, and unusually slow
requests for every run, tagged with the journey phase that initiated them. The
Markdown report lists the 20 slowest successful requests, per-phase request
volume, divergent requests, and failed or cancelled requests separately.
Browser timings separate connection work, time to first byte, streamed or
download time, payload size, cache status, and `Server-Timing`. High time to
first byte points to the server, database, cold start, or an upstream service;
the structured `[perf]` Vercel log for the same route distinguishes those
server-side phases from one another.

Every repetition uses a fresh browser context with the saved authenticated
session. This gives a cold browser cache at the start of the journey while
preserving realistic warm navigation inside that journey.

By default, the suite also deletes the default-construction project IndexedDB
before the first project click in every run. Reports record
`Initial project cache: cold (IndexedDB cleared)`, so `project_first_open_ms`
cannot silently become a restored-snapshot measurement. Set
`PERF_COLD_PROJECT_CACHE=false` only for an explicitly labelled warm-cache
investigation; do not compare that report with the canonical cold benchmark.

## Compare before and after

Run the same number of repetitions against the same project, device, and
production region before and after deployment. Then compare P75 values:

```sh
npm run perf:compare -- \
  .performance-results/benchmark-default-construction-core-baseline-v1-2026-11-08.json \
  .performance-results/benchmark-default-construction-core-after-v1-2026-11-08.json
```

The comparison covers customer-visible P75 timings, slow request-group P75s,
per-phase response volume, cache misses, and failed requests. It labels changes
of at least 10 percent as improvements or regressions. Smaller changes are
reported as inconclusive noise. Comparison also refuses reports with different
benchmark IDs, flow keys, scenarios, or project IDs.

## Include login timing

Password-based Kinde login can be included explicitly:

```sh
PERF_BASE_URL=https://your-production-domain.example \
PERF_PROJECT_ID=your-test-project-id \
PERF_RUNS=5 \
PERF_INCLUDE_LOGIN=true \
PERF_LOGIN_EMAIL=performance-test@example.com \
PERF_LOGIN_PASSWORD=local-secret \
npm run perf:prod
```

Keep credentials in the shell or an uncommitted environment file. Accounts
using social login or MFA should use the saved-session flow and measure login
separately, because interactive challenges cannot be made deterministic.
