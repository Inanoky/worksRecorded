# TGEM invoice packages

TGEM WhatsApp intake saves images and PDFs into a persistent draft scoped to the
organization, user and WhatsApp business number. The draft keeps its selected
project until its documents are submitted for processing. Other flow modules retain their
existing intake behavior.

Each file is reserved in Postgres before downloading it, then stored in
UploadThing. Receiving a file does not create an invoice or start extraction.
Files selected together in WhatsApp and files sent individually accumulate in
the same draft. Album membership is not inferred from timing.

The Latvian reply shows the saved document count out of 10 and offers
**Apstrādāt** and, for multiple files, **Katru atsevišķi**. Sending another image or PDF adds it to the same
draft without another button click. **Apstrādāt** submits all saved documents
as one invoice, including a single-document draft. **Katru atsevišķi** creates
one independent invoice per uploaded file. The process buttons appear
once pending uploads finish. At the limit, another file is rejected without
downloading it. The user must process the current draft first. Uploaded documents
cannot be discarded through a draft action, an old button or a text command.
Buttons contain a draft revision; an older button cannot submit a changed
draft. A text command **Apstrādāt** is also accepted if interactive buttons fail.
Meta button failures log the draft ID and provider error code without the
message contents.

Submission locks the draft row and creates one invoice containing all ready
WhatsApp files, or one invoice per file when separate processing is selected.
Web upload offers the same grouping choice. File links and invoice
idempotency keys prevent repeated submissions from creating another invoice.
WhatsApp submission buttons become read-only after the first submission.
Replaying any old processing or grouping button only returns the existing
submission status and never dispatches an AI job, including when an invoice
has failed processing. Submitted drafts also ignore late upload callbacks.
Documents remain in the active draft until submitted for processing.

The background workflow sends a Latvian completion message to the original
WhatsApp sender and business number after every invoice in the submission has
finished. It waits through processing retries, reports failures accurately,
and can report recovery after a failed invoice is retried. Draft row locks and
audit claims suppress concurrent completion messages. Notification retries run
as a separate workflow step and never repeat extraction. Provider acceptance
and message IDs are recorded in invoice audit events; this does not prove
delivery. Notifications outside the 24-hour submission window are skipped.
No new database migration is required for completion notifications.

Web upload also accepts multiple files, with a choice between one invoice with
attachments and separate invoices. Every selected file must be saved before the
web draft can be submitted. A failed submission can be retried without uploading
the package again. Single-file web intake keeps its existing path.

Limits are 10 files per draft, 16 MB per file and 32 MB in total. Project invoice
access is required to collect files; submission checks approval submission
permission again on the server.

Grouped extraction uses the existing OpenAI invoice processor with all documents
in one request. It chooses a main financial document, preferring an invoice over
its receipt, and extracts amounts and line items from that document and its
continuation pages. Supporting documents retain their own OCR pages and remain
selectable from an equal-weight clickable document list in the invoice preview
and detail view. Long WhatsApp identifiers are shortened for display; full
message IDs remain available for deduplication. A receipt does not mark an
invoice paid. Ambiguous or conflicting packages require manual review and skip
automatic approval. An explicitly configured Google processor rejects grouped
submission before creating invoices; separate invoices remain supported.

## Rollout

The forward migration
`20261119160000_add_tgem_invoice_upload_drafts` must be applied before deploying
the matching application and generated Prisma client. Follow
`DATABASE_MIGRATIONS.md`; production migration requires explicit approval.

Local verification uses mocked storage, WhatsApp, workflows and AI. Deployment
acceptance should include a real TGEM invoice plus receipt, individually sent
files, multiple selected files, a repeated submission button, the
10-document limit and both web upload choices. The user should message the
business first, then receive native reply buttons within the 24-hour service
window; this does not require an approved template. Confirm one financial
invoice for a package, all files viewable, and unchanged behavior for other
flow modules. Local mocks do not establish Meta delivery or button rendering
in a real WhatsApp client.
