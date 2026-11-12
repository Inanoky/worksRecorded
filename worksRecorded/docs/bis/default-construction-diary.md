# Default-construction BIS diary

## Project references

The construction workspace starts loading BIS project references when the diary
mounts during project preload. Opening the send dialog reuses the loaded lists.
They are not stored in browser persistent storage.

- Drawing pages: `GET logbook/project`, submitted as `attributes.project_document_ids`.
- Estimate elements: `GET logbook/estimate_positions`, submitted as the single
  `relationships.estimate_positions` item supported by BIS.
- Lists include every API page. Estimate groups are not selectable and positions
  are filtered to the configured construction round or shared positions.
- Server cache lifetime is ten minutes, scoped to account, BIS environment, site,
  case and construction round. Every read still checks project access and BIS
  authentication. “Atjaunot sarakstus” refreshes both lists explicitly.
- Submission validates selected IDs against the current scoped cache. Materials
  keep their separate fresh availability check.

## Create an act

Select up to thirty diary records using the existing checkboxes. “Izveidot aktu”
is enabled only when all selected rows have a BIS ID and local approved status.
The server checks project ownership, archive state, duplicate BIS links and the
current BIS approval and round again during review and creation.

The dialog supports two BIS draft types:

- Darbu pieņemšanas akts: `POST logbook/accomplished_work_certificates`.
  Approved works are grouped into BIS estimate elements with compatible units.
  Quantities and linked work IDs come from BIS, not unsaved local edits.
- Segto darbu pieņemšanas akts: `POST logbook/covered_works_acceptance_acts`.
  The draft includes the selected approved works, their source drawing pages and
  aggregated material use. The user supplies the name, description, date, time
  and required `logbook_case_act_id`. The supplied Postman collection does not
  expose a list endpoint for that reference: recently used IDs are discovered
  from the latest twenty covered-work acts; a new ID can be entered manually.

Act review is fingerprinted. A change to the BIS works or estimates requires a
new review before creation. Draft creation does not submit or approve the act.
The result provides a direct BIS editing link.

Creation attempts are stored under
`Site.siteDiaryRecordsMap.otherSettings.bisDiaryActOperations`. A short row lock
claims an attempt before the external POST. Remote calls never hold that lock.
Completed retries return the existing ID; concurrent and ambiguous attempts are
blocked. An ambiguous timeout/5xx remains `unknown` and requires checking BIS
before an operator reconciles its status. It is never automatically re-posted.
Definite validation/access rejections can be corrected and retried. This uses
existing storage and requires no schema migration.

## Manual materials

“Pievienot materiālu” creates an ordinary local warehouse row without submitting
it to BIS. Name, quantity, unit and material date are required. Cost, supplier and
invoice details are optional; an unknown cost remains null. Existing warehouse
controls can attach the BIS material configuration, documents and Forma 2
position afterwards.

Project and organization ownership are resolved on the server. A stable request
UUID prevents a retry from inserting the same material twice; a conflicting UUID
cannot overwrite an existing row.

## Verification

The reference loader, act payloads, authorization/approval checks, retry handling,
manual-material validation and retained-project integration have targeted Jest
tests. BIS writes are mocked. No production records or BIS acts are created by
these checks.
