# Project-scoped diary and warehouse feedback

Default-construction projects have independent, versioned prompt helpers for
Būvdarbu žurnāls and Noliktava. This is prompt memory, not model fine-tuning.
It does not recategorize or rewrite existing business records.

## Learning and use

The refresher fingerprints all active construction diary records and the project
catalog, including current edited classifications, quantities and comments.
Archived records and ZTC operational tables are not used. The model receives at
most 40 distinct source-to-classification examples: first one recent example
per work category, then additional recent examples. This keeps older categories
represented while bounding model context. Examples without an original message
are excluded. URLs, email addresses and phone numbers are redacted. Personal
names must not appear in generated guidance.

Warehouse guidance uses material names, BIS categories, units and material-only
Forma 2 assignments, prioritizing manual assignments. It does not use diary rows
or work allocations. Split and contradictory assignments are treated as uncertainty.
Diary source messages are limited to 250 characters and comments to 100 characters.

Both generators use `gpt-6.1-sol`, medium reasoning, the Responses API and strict
JSON Schema output. Generation has a 120-second deadline and no automatic provider
retries. At most eight short rules and two review points are formatted as Latvian
headings and bullets, limited to 1,800 characters. Manual instructions retain
their independent 6,000-character limit.

The extractor and checker receive the stored helper with the project schema and
existing source-evidence safeguards. Guidance is only terminology/category advice:
the current message, explicit dimensions and current schema win. Old amounts,
hours, people, dates and locations must never become defaults. Contradictory
historical assignments should be flagged, not learned as facts. Storage errors
omit the optional helper rather than breaking WhatsApp saving.

Warehouse invoice extraction and material Forma 2 matching receive warehouse
guidance; diary extraction/checking and work matching receive diary guidance.
BIS category IDs and Forma 2 position IDs remain distinct.

## User control and history

The diary and warehouse toolbars load their own brain on demand. Users can enter
priority project instructions or use “Edit this helper” to copy the generated
helper into the editor, correct it and save. Existing priority instructions cannot
be replaced by that copy action; edit them directly. They are kept verbatim in
subsequent generated versions. Automatic suggestions never overwrite them.

Manual saves, generated changes and restorations append a numbered version
independently per site and domain.
History retains actor, model when applicable, prompts, source record count,
dataset fingerprint and creation time. Restoring does not modify old versions.
History is paginated by revision, 20 versions per page. All read/write actions
require authenticated organization access and default-construction flow membership.

## Scheduling and concurrency

The protected `/api/cron/construction-diary-feedback` endpoint is invoked every
30 minutes. Each eligible brain is checked at most every six hours. Unchanged datasets
do not trigger a model call or a new version. Initial helpers are created for
default-construction projects with newly created records in the last 72 hours.
This gate is per source: warehouse activity does not reactivate the diary brain
or vice versa. Creation time, not the record's work/invoice date, is used, so new
backdated entries count. Inactive brains are not supplied to extractors and cannot
generate even through a forced manual refresh. Saved guidance/history remains
viewable and manual instructions remain editable.

The oldest unchecked eligible brains are processed first, at most four brain jobs
per invocation with concurrency two. Checks are
timestamped on acquisition so repeatedly failing projects do not starve others.
Manual refresh is available and is limited to one attempt per minute.

Independent per-domain database leases prevent simultaneous generation. Model calls run outside DB
transactions. The dataset is checked again before committing; changed sources
discard the generated result. Revision/token compare-and-swap prevents automatic
generation from overwriting a concurrent manual edit. Crashed leases expire in
five minutes. Failures retain the previous helper; later scheduled checks retry.

## Deployment

Apply `20261014103000_construction_diary_feedback` only with production-write
approval, then deploy the generated Prisma client and application. The migration
only creates `ConstructionDiaryFeedback` and `ConstructionDiaryFeedbackVersion`;
it never modifies diary rows, photos or production tables. Both new tables enable
RLS without client policies: only the trusted server DB connection accesses them.

The additive `20261014123000_separate_construction_feedback_domains` migration
assigns existing prompts and history to `diary`, adds compound site/domain keys
and allows independent warehouse versions. It preserves feedback contents and
business data. Deploy the updated Prisma client with the application; restart a
running dev server to pick up the new keys.

The deployment must have `CRON_SECRET` configured. Vercel sends it as a bearer
token. The endpoint fails closed when it is absent and never accepts query secrets.
Scheduling becomes active only after application deployment. Do not run the
refresher from individual WhatsApp requests; those read the previously saved
helper without another AI call.

Before applying the migration, run
`node scripts/test-construction-diary-feedback-migration.cjs`. It tests new tables,
relationships, history insertion, uniqueness and RLS in a rolled-back transaction
and verifies construction/production record and photo counts are unchanged.

Before applying the domain migration, run
`node scripts/test-construction-feedback-domains-migration.cjs`. It backs up
existing feedback, tests content/history preservation, independent domains and
RLS, verifies unchanged diary/material/ZTC/photo counts, then rolls back.
