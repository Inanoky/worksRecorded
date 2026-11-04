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

```sh
PERF_BASE_URL=https://your-production-domain.example \
PERF_PROJECT_ID=your-test-project-id \
PERF_RUNS=10 \
PERF_RUN_LABEL=before-caching-change \
npm run perf:prod
```

Timestamped or labelled JSON and Markdown results are written under
`.performance-results/`, alongside the Playwright HTML report.

Every repetition uses a fresh browser context with the saved authenticated
session. This gives a cold browser cache at the start of the journey while
preserving realistic warm navigation inside that journey.

## Compare before and after

Run the same number of repetitions against the same project, device, and
production region before and after deployment. Then compare P75 values:

```sh
npm run perf:compare -- \
  .performance-results/customer-journey-before-caching-change.json \
  .performance-results/customer-journey-after-caching-change.json
```

The comparison labels changes of at least 10 percent as improvements or
regressions. Smaller changes are reported as inconclusive noise.

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
