# Default-construction performance plan

## Baseline

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

## Batch 1: project synchronization diagnosis and safe reduction

Status: implemented locally, not deployed.

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

Status: planned.

- Remove automatic Forma 2 material-rule writes from warehouse page reads.
- Apply rules during material import, rule creation, copy, transfer, and explicit synchronization.
- Render local material rows before optional BIS configuration data.
- Cache stable BIS classifiers and construction-material configuration per BIS case.
- Defer transfer targets and other non-critical controls until after the table is usable.

Exit criteria:

- Warehouse navigation and reload are read-only with respect to business records.
- Initial table readiness does not wait for BIS classifier downloads.
- Warehouse hard-reload P75 improves without losing BIS controls.

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

