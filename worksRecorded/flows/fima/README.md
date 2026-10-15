# FIMA BIS workflow

The `fima` flow provides an organization register at `/dashboard/fima` and the same workspace scoped to a project at its dashboard route. The selected organization's `FlowAssignment` determines access; customer organization IDs and email addresses are not hardcoded. The normal construction diary remains available through the existing flow registry.

This replaces the static September preview with persisted records. Old preview data is not automatically imported or treated as live BIS state.

## Working process

1. Create/configure a WorksRecorded project for each BIS case in project settings and connect the operator's BIS account.
2. Import the prepared FIMA register or a KUCE crew workbook. A register is grouped by its source BIS case; explicitly map each group to a project. KUCE C/J/Q/X layouts require a selected report month. The preview retains original file, sheet, cell, shift, workers, raw mast notation, review feedback and comparison evidence. Unknown layouts fail visibly. Imported links are protected existing records, never proof of mutation ownership.
3. Prepare descriptions alongside original KUCE text. Search imported KUCE history and live BIS history by project, inspect counterpart materials/quantities/drawings, and save reviewed templates for the exact normalized work name. Templates fill `{masts}` and `{date}`; they do not infer equipment from a vague activity name. Historical KUCE files must first be imported; the web app does not silently scan a local drive.
4. Select the case's responsible person, construction objects, material IDs and project-document IDs. Bulk common-field copying applies the responsible person, objects and drawings within one project, resets review, and can fill empty descriptions from saved templates. Existing descriptions and per-row material quantities are preserved. Review drawing variants for each mast.
5. Set work quantities independently of material quantities. For metre quantities, enter contiguous drawing-backed spans and calculate their sum. Unknown workers remain unknown. Crew merging deduplicates named workers, retains all source rows and does not sum physical work quantities. Existing BIS records cannot be merged here.
6. Mark reviewed rows ready. API bulk actions have a preview and require explicit acknowledgement that BIS can display the system API user as creator. Each selected row is submitted separately, then read back and checked. This flow creates drafts only; it does not submit for approval, approve or delete BIS work records.
7. For personal-name authorship, use the browser-assisted option: copy reviewed fields, open BIS, complete the draft under the logged-in personal profile, and paste its record link for verification. This is manual browser assistance, not automated browser bulk entry. These linked records remain protected from API editing.
8. Export the filtered register with stable FIMA IDs, BIS edit links and row versions. Corrected exported rows may be re-imported only if the ID, project and version still match. Original KUCE sources, material IDs, drawing links and BIS ownership remain intact. Excel text-only material edits require review in the workspace rather than silently replacing catalogue links.

## Storage and protection

- `FimaImportBatch`: immutable parsed source and content hash; repeated imports are idempotent even if the file is renamed.
- `FimaWorkRecord`: organization/project, stable local ID, current proposal, source references, version and independent BIS snapshot/status/ownership.
- `FimaWorkRevision`: prior snapshot, actor and action for edits, imports, merges, synchronization and operations.
- `FimaBisOperation`: durable request, outcome and error. A unique request key prevents replay; a unique case/date/description key guards duplicate concurrent creation across rows.
- `FimaWorkTemplate`: reviewed descriptions and evidence, scoped to the organization and exact normalized KUCE work name.

All server actions authorize the active organization; project resources are checked within it. Existing externally created or submitted records cannot be written. Before changing a managed draft, the operation checks current BIS status and detects edits since its last snapshot. Refreshing an externally changed managed record resets review. Material PATCH requests use existing BIS usage IDs and explicit documented removal instructions; the separate zero action updates only material quantities.

Mutations are never automatically retried. Definite validation/authentication rejection returns the proposal to hold. Timeouts, missing IDs and verification failures remain unknown and block resubmission. After a five-minute recovery window, a stalled operation without an ID can be marked unknown for manual BIS search/linking. Known-ID operations can be reconciled by reading BIS. Manually reconciled links stay protected because generic API authorship is not sufficient evidence of ownership.

The server uses existing BIS token storage, refresh coordination and relay configuration. Safe GET requests can refresh once after 401; write requests are not retried after 401. Pagination is bounded and restricted to the configured BIS origin. Internal notes and comparison evidence are never appended to the BIS description.

## Limits

- Up to 2,000 rows per import and 900 KB of parsed request data, within the existing server-action body limit. Split large files by case/day. Source Excel files are limited to 10 MB.
- Up to 5,000 register rows per workspace response, with an explicit truncation warning; use project views for larger organizations. History searches return at most 100 matches. Common-field copying supports up to 200 selected rows.
- Excel export supplies filters, column widths and links. It does not reproduce arbitrary source-workbook formatting.
- Drawing selection and span entry are evidence-assisted manual review. No OCR/AI inference of mast equipment or unattended personal-profile browser automation is claimed.
- Closing the browser stops further batch dispatch. Persisted per-row operations remain available for reconciliation. There is no background queue for unstarted rows.

## Validation

Run from the application directory:

```powershell
node node_modules/jest/bin/jest.js --runInBand flows/fima lib/flows
node flows/fima/testing/workspace.browser.cjs
node node_modules/prisma/build/index.js validate
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

The browser harness bundles the actual workspace and replaces only its backend modules with deterministic fixtures. It blocks non-local network requests, uses isolated headless Edge on Windows (or Playwright Chromium elsewhere), and saves desktop/mobile screenshots under `outputs/fima-ui`. Override `FIMA_BROWSER_CHANNEL` or `FIMA_TEST_OUTPUT` as needed. Tests never write live BIS or production data.

Read-only compatibility checks on 15 October 2026 parsed the latest FIMA register (204 rows, four case groups, 58 existing links) and the September KUCE report (84 source rows). These are different granularities, not an asserted one-to-one reconciliation. FIMA feedback is retained in notes and source snapshots.

Validation outcome on 15 October 2026: 48 tests across nine FIMA/shared-flow suites passed; the isolated desktop/mobile browser scenario passed; Prisma validation and the full Next.js production build passed, including `/dashboard/fima`. The repository build is configured to skip type validation. A separate TypeScript run reports 195 diagnostics outside the FIMA changes and none in the changed FIMA or dashboard files. Biome reports no errors in the checked implementation, with remaining type/style warnings. No live BIS writes or production migration were performed during implementation.

## Rollout

The additive migration `20261015120000_fima_workflow` creates five tables and their indexes/relations inside a transaction. Client generation does not apply it. Follow `DATABASE_MIGRATIONS.md`: obtain explicit production-write approval, check pending migrations, apply the reviewed migration, deploy the matching application/client, and verify the selected organization's dashboard and project-to-case mappings. Do not apply unrelated pending migrations implicitly.

Assign `fima` through `/dashboard/admin/flow-configs`. Import each case group into its correct project after activation. Initial production acceptance should compare a reviewed draft against its exact proposal and read-back result; personal-name creation must be verified in the personal BIS browser session.

The existing official FIMA logo and scoped red/charcoal palette are retained. Other organization flow modules and shared BIS senders are unchanged.
