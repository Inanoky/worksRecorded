# TGEM recursive invoice splitting plan

Status: active, Batches 1-3 complete

Last updated: 2026-10-02

Batch progress:

- [x] Batch 1: lineage schema and pure allocation engine
- [x] Batch 2: transactional split service
- [x] Batch 3: split workspace
- [ ] Batch 4: lineage presentation and downstream integration
- [ ] Batch 5: integrated validation and rollout preparation

This document is the implementation reference for recursively splitting a TGEM invoice across projects. Work should be delivered in the batches below rather than as one large change. A batch is complete only after its focused tests and checks pass and this status section is updated.

## Product outcome

An active invoice can be split repeatedly until its remaining item quantities and money have been fully allocated.

Each split performs this immutable transition:

`active invoice -> archived parent -> allocated project invoices + optional residual invoice`

- Users move selected whole rows or partial quantities into one or more explicitly selected projects.
- Partial splits use concrete item counts from extraction, not percentages.
- Rows and quantities not taken out form a new residual invoice in the current project.
- If the current invoice is unassigned, the user must choose the residual project.
- If every item is redistributed, the parent is archived and no empty residual case is created.
- Every generated invoice uses the same source image or PDF but contains only its own rows and quantities.
- Any active generated invoice can later become the parent of another split.
- Generated invoice numbers use readable lineage suffixes: the residual invoice labeled `Oriģināls` always receives child ordinal `1`, while allocated split invoices receive `2`, `3`, and onward. The same rule applies recursively, for example `-S1`, `-S2`, then `.1`, `.2`.
- Active leaves have independent approval and payment state.
- Archived ancestors retain immutable allocation and audit history and are excluded from active registers and totals.

## Confirmed decisions

- Preserve a direct parent ID for every generated invoice.
- Keep an indexed root lineage ID so related descendants can be found without recursive queries.
- Archive and replace the current case instead of reducing it in place.
- Create a new residual case only when rows, quantity, or money remain.
- Inherit the current project for the residual. Require an explicit residual project when the parent is unassigned.
- Consolidate allocations for the same destination project into one generated invoice.
- Require a manual source count before partially splitting a row whose quantity was not extracted.
- Keep payment independent for each active split invoice.
- Create every generated invoice in `needs_review`; approval does not auto-start.
- Do not maintain live total formulas between related invoices after a split commits.
- Do not upload duplicate document bytes.
- Do not implement tree-wide undo. Incorrect active leaves can be archived and the source document can be uploaded again.

## Data model

Extend `TgemInvoiceCase` through a new forward migration:

- `splitParentInvoiceCaseId`: nullable self-reference to the immediate archived parent.
- `splitRootInvoiceCaseId`: nullable indexed scalar containing the original root case ID.
- `splitGeneration`: integer with `0` as the default for unsplit intake cases.
- `splitKind`: nullable value distinguishing `allocated` and `residual` children.
- `splitSubtotalAdjustment`: nullable decimal containing the transparent share of an invoice-level line/subtotal mismatch.

The direct parent is immutable after creation. The first generation uses the original invoice ID as its root ID; later generations inherit that root. Root IDs are grouping metadata, not a source for recalculating totals.

Archived parents keep their original lines, documents, OCR records, approval history, and audit events. Hard deletion of a referenced parent is unsupported.

## Split input and validation

Add a `splitTgemInvoice` server action with:

- Parent invoice ID and `expectedUpdatedAt`.
- One or more destination project IDs.
- Selected source line IDs and quantities allocated to each destination.
- An optional corrected source quantity for rows missing a usable extracted quantity.
- A residual project ID only when the parent is unassigned.

The server, not the browser, is authoritative for all calculations.

The parent must be:

- An active, non-archived leaf.
- Extraction-complete and not processing.
- Unpaid.
- In review, or in an approval round with no completed decision.
- Accessible to an active member of its organization under the TGEM flow.

Allocation rules:

- A selected partial row produces destination child rows and, when quantity remains, a residual row.
- A selected whole row appears only in its destination invoice.
- An untouched row appears only in the residual invoice.
- A quantity allocation must be positive and cannot exceed the parent quantity.
- Allocations plus the residual must equal the parent quantity exactly.
- A row without an extracted quantity requires a positive manual source count before partial allocation.
- The corrected source count is recorded in the split audit payload and persisted on generated rows; the archived parent remains unchanged.
- A row with neither usable quantity nor monetary basis can only move as a whole row.
- Every destination project must receive at least one non-zero allocation.
- Destination projects must be unique and must differ from the residual project.
- If a residual exists, one destination project is sufficient.
- If no residual exists, at least two destination projects are required; moving the entire invoice to one project uses normal project reassignment.

## Financial conservation

All calculations use decimal arithmetic. JavaScript floating-point values must not be used for persisted quantities or money.

For a partially allocated row:

- Preserve the parent line total as the authoritative monetary basis.
- Calculate each destination amount as `parent line total * allocated quantity / source quantity`.
- Assign the exact remaining quantity and monetary rounding remainder to the residual row.
- If no residual exists, distribute the last minor-unit remainder deterministically across destination allocations.
- Preserve description, unit, unit price, currency, cost-code/category data, suggestions, confidence, source text, and original line number.
- Retain the sign of discounts and credit rows.

For generated invoice headers:

- Calculate the generated line sum from only that invoice's rows.
- Distribute the difference between the parent line sum and parent subtotal proportionally by allocated monetary value.
- Persist that difference in `splitSubtotalAdjustment` and expose it in the UI and export.
- Allocate VAT from reconciled subtotal shares.
- Preserve exact parent subtotal, VAT, and gross-total conservation across immediate children.
- Use the currency's minor-unit precision and deterministic remainder assignment.
- Preserve null source values as null instead of inventing them.
- Block the split when currencies conflict, header values are inconsistent beyond rounding tolerance, or a partial allocation has no defensible monetary basis.

The required invariant for every committed split is:

`archived parent quantities and amounts = allocated children + optional residual child`

## Transaction and audit behavior

Perform the complete split in one Prisma transaction:

1. Load and validate the parent, organization, projects, lines, documents, OCR pages, approval steps, and optimistic version.
2. Reject a non-leaf case or a case with any completed approval decision.
3. Calculate all destination and residual rows and totals.
4. Cancel only undecided current/waiting approval steps on the parent.
5. Create one allocated child case per destination project.
6. Create the residual child only when something remains.
7. Copy document metadata and OCR page metadata while retaining the same permanent storage URL/key.
8. Create the generated line rows.
9. Archive the parent and set its status to `split`.
10. Append parent and child audit events.

Parent event `invoice_split` records generated IDs, projects, lineage, quantities, manual source-count corrections, monetary allocations, and reconciliation adjustments.

Child event `invoice_created_from_split` records parent/root IDs, generation, split kind, and that child's allocation summary.

The operation must be retry-safe. If a client retries after the transaction committed, return the already-created immediate children instead of producing another generation.

## Dashboard behavior

Add the split action to both the register preview and approval detail surfaces.

The localized split workspace should:

1. Select destination projects.
2. Select whole invoice rows or enter concrete quantities per project.
3. Request a manual source count when extraction did not provide one.(This is basically edit/correction mode for Invoice rows, cuz AI does extraction and for large quantities it can become overwhelming to extract all the data correctly)
4. Request a residual project only for an unassigned parent.
5. Preview every allocated invoice and the optional residual.
6. Show source-versus-result quantity and monetary reconciliation.
7. Confirm through one active action with competing actions disabled.

Generated invoice surfaces show:

- A localized `Sadalīts rēķins` badge.
- Generation and immediate-parent reference.
- A localized residual indicator where applicable.
- Only the allocated rows and quantities owned by that case.
- Any `splitSubtotalAdjustment` as an explicit reconciliation row.
- The same authenticated document viewer and OCR text as the source.
- Independent approval and payment controls.

Do not show `part X of N`; repeated splitting makes that label unstable.

## Register, duplicate, export, and storage behavior

- Ordinary queries continue to exclude archived cases, so only active leaves contribute to registers and totals.
- Related active leaves sharing one root are not duplicates of each other.
- An unrelated root with the same supplier invoice number must still trigger the existing duplicate warning.
- Project filters use each active case's authoritative `siteId`.
- Add split root, parent, generation, kind, and reconciliation adjustment columns to both XLSX sheets.
- Export only the rows and totals belonging to each active invoice.
- Each generated case receives its own `TgemInvoiceDocument` and OCR-page rows for the existing authenticated route.
- All copied document rows retain the same underlying UploadThing URL/key; the file is not uploaded again.
- Future storage deletion must check all active and archived document references before deleting the shared object.

## Implementation batches

### Batch 1: lineage schema and pure allocation engine

Status: complete on 2026-10-02. The migration file is authored but has not been run or applied. Focused allocation tests, Prisma validation, touched-file Biome, and `git diff --check` pass. Repository-wide TypeScript still reports unrelated baseline errors outside the Batch 1 files.

- Add the Prisma fields, indexes, self-relation, and forward migration.
- Add shared split input/result types and decimal/currency helpers.
- Implement a pure allocation calculator with no database or UI dependencies.
- Cover quantities, manual missing counts, residual calculation, subtotal adjustment, VAT/gross allocation, discounts, and rounding with unit tests.
- Stop after `npx prisma validate`, focused calculator tests, touched-file Biome, and `git diff --check` pass.

### Batch 2: transactional split service

Status: complete on 2026-10-02. The authenticated server action and serializable transaction service now enforce active TGEM organization access, optimistic concurrency, active-leaf and approval-state rules, exact retry fingerprints, destination availability, and atomic parent replacement. Generated cases preserve lineage, create independent review/payment state, copy line/document/OCR metadata without uploading bytes again, cancel only undecided parent steps, and append parent/child audits. Focused Batch 1-2 tests, Prisma validation, generated-client type refresh, touched-file Biome, focused TypeScript diagnostics, and diff checks pass. The migration remains authored but unapplied.

- Implement authorization, state validation, optimistic concurrency, active-leaf enforcement, and retry safety.
- Create destination/residual cases, lines, document/OCR copies, archived-parent state, cancelled undecided approval steps, and audit events atomically.
- Add action tests for rollback, conflicts, forbidden states, repeated generations, and conservation.
- Stop after the focused action/service tests and Batch 1 checks pass.

### Batch 3: split workspace

Status: complete on 2026-10-02. A shared split workspace is available from both the register preview and approval detail through the reused invoice information card. It supports unique destination projects, whole-row moves, concrete partial quantities, manual source counts, unassigned residual projects, exact allocator-backed child previews, quantity and monetary reconciliation, localized Latvian/English/Russian copy, pending-action locks, typed server errors, and conflict refresh. The full TGEM frontend directory plus split action/allocation regressions pass with 9 suites and 134 tests; touched-file Biome, focused TypeScript diagnostics, Prisma validation, and diff checks pass. No migration was run or applied.

- Add the split action in the register preview and approval detail.
- Build project selection, row selection, concrete count allocation, manual missing-count entry, residual handling, preview, validation, and confirmation.
- Add Latvian, English, and Russian copy.
- Add component tests for whole rows, partial rows, multiple destinations, unassigned residuals, blocking errors, loading, and conflict refresh.
- Stop after focused dashboard tests and touched-file checks pass.

### Batch 4: lineage presentation and downstream integration

- Add split/residual badges and lineage metadata to dashboard serialization and invoice details.
- Make duplicate detection root-aware.
- Extend both XLSX sheets and regression-test project filters, register totals, approvals, payment, archive behavior, and authenticated document viewing.
- Stop after all focused TGEM suites, export tests, Biome, and `git diff --check` pass.

### Batch 5: integrated validation and rollout preparation

- Run `npm run test:all`, `npx tsc --noEmit`, `npx prisma validate`, relevant TGEM suites, and `git diff --check`.
- Perform authenticated browser acceptance for repeated splitting, document reuse, independent approvals, and independent payments.
- Update this document with shipped batches and any deferred findings.
- Check migration status separately. Do not run `npx prisma migrate deploy` without explicit approval.

## Required test scenarios

- Move one complete row and leave all other rows in the residual.
- Divide one extracted quantity across two or more projects and retain the exact remainder.
- Mix complete and partial rows in one operation.
- Supply a missing source count manually, then split it.
- Allocate everything and create no residual case.
- Split a residual again through multiple generations.
- Split a previously allocated child again.
- Preserve exact quantity, subtotal, VAT, gross total, and signed discount conservation at every parent-child boundary.
- Reject over-allocation, zero allocation, unavailable projects, duplicate destinations, mixed currencies, inconsistent headers, stale versions, processing cases, paid cases, archived ancestors, and cases with completed approval decisions.
- Retry the same committed request without creating duplicate children.
- Suppress sibling/descendant duplicate warnings while preserving warnings for unrelated invoice roots.
- Verify every generated case can render the shared PDF/image and OCR text through its own authenticated document route.

## Explicit non-goals

- Editing archived parent snapshots.
- Live formulas or synchronized totals between lineage members.
- Recursive approval or payment state propagation.
- Automatic tree-wide undo or merge.
- Duplicate storage uploads.
- Splitting by percentage when a concrete item count is available.
- Applying the production migration as part of an implementation batch without separate approval.
