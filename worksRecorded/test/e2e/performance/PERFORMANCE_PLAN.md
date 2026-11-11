# Default-construction performance plan

## Historical baseline

- Benchmark ID: `default-construction-core`
- Project: `Pļavas iela 2`
- Scenario: projects, diary, warehouse, warm navigation, browser history, hard reloads
- Baseline label: `baseline-v1-2026-11-08`
- Runs: 5
- Diary/warehouse cycles per run: 3
- Report: `.performance-results/benchmark-default-construction-core-baseline-v1-2026-11-08.json`

Baseline P75 values:

| Metric | P75 |
| --- | ---: |
| Projects cold load | 7,018 ms |
| Project first open | 14,118 ms |
| Construction-project request | 10,035 ms |
| Warehouse first open | 9,733 ms |
| Warehouse hard reload | 9,853 ms |
| Diary hard reload | 4,847 ms |
| Warm diary to warehouse | 91–97 ms |
| Warm warehouse to diary | 73–74 ms |

## Current accepted production benchmark

- Benchmark ID: `default-construction-core`
- Project: `Pļavas iela 2`
- Secondary project: `B68`
- Scenario: project switch, Forma 2, warehouse material and invoice views, warm navigation, browser history, and hard reloads
- Benchmark label: `prod-dashboard-bootstrap-5x3-2026-11-10`
- Runs: 5 independent cold browser contexts
- Diary/warehouse cycles per run: 3
- Initial project cache: cold, with IndexedDB cleared before each first project open
- Report: `.performance-results/benchmark-default-construction-core-prod-dashboard-bootstrap-5x3-2026-11-10.json`

Accepted benchmark values:

| Metric | P75 | P95 |
| --- | ---: | ---: |
| Projects cold load | 3,549 ms | 5,626 ms |
| Project first open | 3,543 ms | 4,552 ms |
| Project client open to diary ready | 459 ms | 814 ms |
| Primary to B68 project switch | 3,508 ms | 3,802 ms |
| B68 to primary project switch | 429 ms | 440 ms |
| Diary to Forma 2 | 4,425 ms | 5,436 ms |
| Warehouse first open | 4,183 ms | 4,376 ms |
| Warehouse hard reload | 4,009 ms | 4,085 ms |
| Warehouse materials to invoices | 234 ms | 254 ms |
| Cached invoice reopen | 829 ms | 847 ms |
| Warm diary to warehouse | 81–85 ms | 88–95 ms |
| Warm warehouse to diary | 76–78 ms | 76–115 ms |

All five journeys passed their readiness checks, each primary and secondary
project produced exactly one bootstrap request, no WorksRecorded request
returned an HTTP 4xx or 5xx response, and cached invoice reopen produced zero
invoice-row refetches. Use this report as the comparison source for the next
deployed performance batch.

The five-run sample supports P75 and observed P95 comparisons, but it is not a
statistical guarantee that these timings hold for 90% of all users, regions,
devices, and production periods. Confirm durability with repeated equivalent
5x3 reports; use a larger run count if a formal P90 service target is needed.

## Active plan: cold diary bootstrap

Status: the cold bootstrap API and client handoff are implemented, deployed,
and measured in the current accepted production benchmark. Cold project-open
P75 was unchanged against the preceding five-run report, while client
open-to-diary readiness improved by 24.9%. Keep future server/bootstrap work as
a separate deployment and benchmark boundary.

Goal: reduce the first default-construction project opening in a fresh browser context without weakening authorization, moving mutations to the browser, or making cached data authoritative.

### Stage 1: consolidate authorized project context

- Use one authorized site lookup for project identity, organization, BIS configuration, and diary mode.
- Reuse that result in the project workspace layout and construction-project access gate.
- Preserve the existing organization membership and superuser access rules.
- Preserve flow resolution and FIMA/default-construction separation.

Exit criteria:

- Revoked and cross-organization access remains denied.
- Default-construction and FIMA collaboration routing remains unchanged.
- The workspace layout and construction-project access gate no longer issue a second site configuration query.
- Production logs separate workspace authentication, authorized site loading, and flow resolution.
- Focused access, workspace, and project-route tests pass; touched files have no TypeScript diagnostics and pass Biome and whitespace checks.

### Stage 2: default-construction browser-first bootstrap

Default construction already uses the Limeni `PersistentProjectCache` engine
with its own `construction:snapshot` cache key. Extend and verify that shared
implementation instead of introducing a second cache.

- Restore the scoped IndexedDB snapshot before waiting for network
  revalidation.
- Make the cached diary usable while the authenticated ETag/delta request runs
  in the background.
- Retain the same project snapshot across diary and warehouse navigation.
- Merge server deltas and confirmed save results into the cached snapshot using
  the existing project synchronization contract.
- Keep cache scope tied to the authenticated identity, organization, project,
  and construction snapshot key.
- Clear or reject cached data after identity changes, denied access, incompatible
  schema versions, or an invalid project response.
- Do not make IndexedDB authoritative and do not move authorization, mutation
  validation, financial truth, or cross-organization access checks into the
  browser.
- Do not add a service worker or a second browser cache until the existing
  IndexedDB behavior has been measured.

First batch: remove the default-construction cached-sync negotiation request.
When a construction snapshot already has part and diary-row revisions, send
them directly through the existing authenticated POST sync contract. Keep the
Limeni negotiation behavior unchanged until this batch is measured.

The same deployment batch limits default-construction diary presentation and
image demand:

- Render the three newest day groups first while keeping ten days as the normal
  page size.
- Reveal the remaining seven first-page days only after an explicit user action.
- Do not bulk-download diary originals during project opening or while the
  record editor is on its records tab.
- Mount day and full galleries on demand and let thumbnails load lazily.
- Keep Limeni image preparation unchanged in this batch.
- Treat server-side day-cursor pagination as a later data-volume batch; this
  first step reduces DOM and image/network work but does not yet remove older
  diary rows from the authoritative project snapshot.

Before-batch references:

- Browser report:
  `.performance-results/benchmark-default-construction-core-before-cached-sync-direct-post-2026-11-09.json`
- Vercel phase summary:
  `.performance-results/benchmark-default-construction-core-before-cached-sync-direct-post-2026-11-09-vercel-phases.json`
- Cached unchanged checks: 32 samples, 2,935 ms P75 per manifest request.
- Construction-project cold snapshot: 6 samples, 6,453 ms P75.

Exit criteria:

- A warm hard reload can render usable cached diary content before project
  revalidation finishes.
- The background request still returns `304`, a delta, or a replacement
  snapshot according to the existing server contract.
- Local diary edits and queued saves are not overwritten by background
  revalidation.
- Switching user, organization, project, or flow cannot expose another cache
  scope.
- Offline cache failure falls back to the normal authenticated cold request.

### Stage 3: reduce the critical cold snapshot

- Add an authenticated `/construction-project/bootstrap` read endpoint for
  empty-cache default-construction openings.
- Authorize once, skip the revision manifest, and return configuration plus the
  newest three diary dates and their media metadata.
- Return a valid but explicitly temporary snapshot without Forma 2 results or
  Visual planning assets.
- Publish that snapshot immediately, do not store it as the durable IndexedDB
  snapshot, and start the existing complete sync after the diary is usable.
- Keep cached openings on the existing ETag/delta endpoint, and keep Limeni on
  its existing endpoint.
- Use production phase timings to decide whether Forma 2, complete media metadata, or both should leave the diary critical path.
- Keep the diary configuration and first usable diary rows authoritative.
- Load deferred resources through their existing authenticated endpoints and ETag contracts.
- Do not change the snapshot contract until the Stage 1 production benchmark identifies the dominant cold-snapshot phase.
- Calculate bounded presentation-only grouping, sorting, and derived UI state in
  the browser after the required records have arrived.
- Keep calculations on the server when the browser does not have the complete
  authoritative dataset.

Local validation:

- The bootstrap route denies unauthenticated and unauthorized requests before
  reading diary data.
- The newest-day query is limited to three distinct diary dates.
- The browser publishes the temporary bootstrap without persisting it, then
  replaces and persists it after the complete sync.
- Ten focused suites pass with 61 tests; touched bootstrap paths pass Biome and
  have no filtered TypeScript diagnostics.

### Stage 4: project-opening intent prefetch

- Prefetch only the project the user indicates through hover, focus, touch, or click intent.
- Do not eagerly open every project card or multiply full project database reads.
- Cancel obsolete work when project selection changes.
- Reuse a successful prefetched response or in-flight request when the selected
  project workspace mounts.
- Keep authorization and response validation identical to a normal project
  opening.

### Stage 5: browser bootstrap timing

- Measure IndexedDB open/read, first construction-project request start, response, hydration, and diary readiness.
- Save browser-side cache, sync, snapshot publication, and diary readiness durations in every benchmark report.
- Only race cache lookup with a cold request if production evidence shows cache lookup materially delays an empty-cache opening.
- Report cold-cache and warm-cache project openings separately so browser-cache
  gains cannot hide slow server work.

Measurement gate:

1. Run the cold-cache journey with the project snapshot removed from IndexedDB.
2. Run the warm-cache journey with a valid construction snapshot already stored.
3. Run the named 1×1 default-construction smoke benchmark after deployment.
4. Inspect `workspaceAuthMs`, `workspaceSiteAccessMs`, `workspaceFlowMs`, `manifestAccessMs`, `manifestQueryMs`, snapshot phases, IndexedDB timing, response bytes, and diary readiness.
5. Run the matching 5×3 benchmark only after both smoke journeys are correct.
6. Require at least a 10% cold customer-visible P75 improvement for server batches.
7. Require cached diary readiness to precede network revalidation on the warm journey without authorization, stale-data, mutation, or cross-flow regressions.

## Batch 1: project synchronization diagnosis and safe reduction

Status: deployed and benchmarked on 2026-11-08.

- Add phase tracing for authentication, manifest, delta, snapshot, payload, and response type.
- Add default-construction snapshot timings for diary, configuration, Forma 2, BIS, language, assembly, and hashing.
- Use a default-construction manifest that excludes Visual planning, contact, and WhatsApp task-send sources.
- Reuse the authorized manifest organization when building the initial snapshot.
- Preserve existing ETag, row-version, delta, access-control, and deployment-revision semantics.

Exit criteria:

- Focused synchronization and revision tests pass.
- Deploy before measuring impact.
- Run `after-batch-1` with the same named 5×3 benchmark.
- Inspect `[perf]` events to determine `manifestQueryMs`, `snapshotDiaryMs`, `snapshotForma2Ms`, and other phase costs.

Measured result:

- Construction-project request P75 improved from 10,035 ms to 7,392 ms.
- Project first-open P75 improved from 14,118 ms to 11,609 ms.
- Remaining work moved into the active cold diary bootstrap stages above.

## Batch 2: revision architecture

Status: planned after Batch 1 production timings.

- Replace full-row JSON hashing with source-specific project revision counters or a project revision ledger.
- Update revision counters transactionally from diary, media, materials, configuration, worker, user, BIS, and Forma 2 mutation paths.
- Keep per-row diary revisions for incremental row delivery.
- Add consistency tests proving each supported mutation changes the required revision.

Exit criteria:

- No stale project data after supported mutations.
- Construction-project P75 materially lower than the Batch 1 measurement.
- Unchanged checks return 304 without scanning full project tables.

## Batch 3: warehouse read path

Status: deployed and benchmarked on 2026-11-09.

- Remove automatic Forma 2 material-rule writes from warehouse page reads.
- Apply rules during material import, rule creation, copy, transfer, and explicit synchronization.
- Render local material rows before optional BIS configuration data.
- Cache stable BIS classifiers and construction-material configuration per BIS case.
- Defer transfer targets and other non-critical controls until after the table is usable.

Exit criteria:

- Warehouse navigation and reload are read-only with respect to business records.
- Initial table readiness does not wait for BIS classifier downloads.
- Warehouse hard-reload P75 improves without losing BIS controls.

Measured result:

- Warehouse first-open P75 improved from 12,600 ms to 5,318 ms compared with
  the preceding project-sync benchmark.
- Warehouse hard-reload P75 improved from 10,108 ms to 4,746 ms.

## Batch 4: warehouse query scaling

Status: planned.

- Move spend totals and monthly/supplier grouping into database queries.
- Keep initial material loading paginated for privileged and non-privileged users.
- Verify indexes for site, effective date, supplier, invoice, status, and default sort paths.
- Add large-fixture query tests.

## Batch 5: projects page and benchmark identity

Status: planned.

- Create a dedicated non-superuser performance account for the default-construction organization.
- Select only project-card fields on the projects page.
- Paginate the superuser cross-organization project catalogue.
- Parallelize independent organization, language, flow, and project-card reads.
- Keep the current superuser result as an admin diagnostic, not a client-facing baseline.

## Batch 6: media and cancelled work

Status: planned.

- Identify warehouse source files blocked by ORB.
- Render only supported images as images and provide correct previews for PDFs and other files.
- Prevent project synchronization from starting or continuing when navigation immediately leaves the diary.
- Classify expected Next.js navigation cancellations separately from actionable failures.

## Measurement protocol

1. Deploy one batch at a time.
2. Confirm the production deployment before measuring.
3. Run a named 1×1 smoke benchmark.
4. Run the named 5×3 benchmark with an `after-batch-N` label.
5. Compare it only with a report having the same benchmark ID, flow, scenario, and project ID.
6. Accept an improvement when customer-visible P75 improves by at least 10% without new deterministic failures, business-data mutations, or material regressions elsewhere.

