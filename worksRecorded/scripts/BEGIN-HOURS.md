# Begin hours for Limeni

Enabled only for organization `58467603-196e-4661-83ff-fe26e4b0ff0b`.
No schema change or API credentials are required. The existing daily calculation is unchanged; its label becomes Ieņēmumi. Stundas izmaksas sums Begin Duration minutes and rounds `minutes * rateCents / 60` once to cents. The initial rate is 1250 cents/hour. Approval status is preserved but does not exclude completed durations. Comments never add hours or imply a project assignment.

## Storage

One sitediaryrecords envelope per organization/site/calendar date. Comments_Custom_2 holds validated versioned JSON. Date is stored at UTC noon; the JSON date is the authoritative Latvian work date. A deterministic SHA-256 ID and organization transaction lock prevent duplicate daily envelopes. Previous revisions stay in history. Source-identical reimports do not write. Each imported day retains its rate.

Envelopes have archiveReason `begin-hours:v1` and non-null archivedAt. This deliberately uses the existing inactive-record mechanism so ordinary diary reads, calculations, copying, editing and exports exclude these storage records. The separate Begin reader explicitly selects this marker. They are current hours data, not deleted hours. Do not restore or purge these envelopes through a generic archive maintenance tool. No quantities, TimeInvolved or WorkersInvolved are populated.

The importer refuses to write if the organization has ordinary content in Comments_Custom_2, or the selected project's configuration renders that field. It refuses cross-project source-object reuse, mismatched source companies, changes to an existing day's object selection, older capture dates and stale previews. Project mapping corrections need a separate reviewed operation. Readers authorize through orgCheck; mutations repeat authorization on the server. The CLI is an operator tool using database credentials and the same persistence service.

## Later imports

1. Capture a complete Begin period (maximum 31 days) using the browser. Reconcile captured row count and summed Duration against Begin. Preserve duplicate-looking source rows. Never derive extra hours from comments.
2. Prepare JSON matching parseBeginSnapshot in lib/begin-hours.ts. It contains source, company, targetOrganizationId, from, through, capturedOn, workers, objects, columns, and tuple rows. Missing duration is null; ongoing and missing-end are distinct statuses. Source objects may be blank, but blank objects cannot be mapped automatically.
3. Open the project's diary, select Importēt Stundas datus, choose the file and its explicit Begin object(s). Review the period, counts and previous/new duration, then save. All dates in the selected period replace that project's corresponding snapshot, including removed entries. Empty days do not create visual diary rows.
4. Review unmatched objects separately. The current UI does not infer mappings from comments. It shows imported days without ordinary diary records on the first list page and respects date filters. Source hours are whole-day totals even when the visible ordinary work rows are filtered.

Operator alternative:

    npx tsx scripts/import-begin-hours.ts snapshot.json mappings.json
    npx tsx scripts/import-begin-hours.ts snapshot.json mappings.json --apply

Mappings are an array of `{ "siteId": "...", "objects": ["Exact Begin object"] }`. Preview is the default. Apply commits each project separately and can safely be rerun after a partial failure. Keep real snapshots and mappings outside the repository. Snapshot JSON is not an Excel or CSV export.

## Checks

    npx jest --runInBand lib/begin-hours.test.ts server/actions/begin-hours-actions.test.ts components/sitediary/BeginHours.test.tsx

Test data is synthetic. New tables, clock-in changes, payroll calculations and deployments are outside this implementation.
