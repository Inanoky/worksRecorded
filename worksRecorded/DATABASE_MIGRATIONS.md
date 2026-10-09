# Database migration workflow

## Production model

WorksRecorded currently has one production PostgreSQL database. The committed
Prisma migration chain in `prisma/migrations/` is expected to produce the schema
described by `prisma/schema.prisma`.

Treat migrations as forward-only. Do not edit an applied migration to repair
production state; add a new migration that moves the existing schema forward.
Historical documents may describe whether a migration was applied at the time
they were written, but the production database and `prisma migrate status` are
the current source of truth.

## Production verification and deployment

From the repository root, with `DATABASE_URL` pointing to the single production
database:

```bash
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate status
```

The first and last commands are read-only status checks. `migrate deploy`
applies the pending committed migrations and must only be run with explicit
approval for a production write.

Do not use `prisma migrate dev` or `prisma db push` against production. Prisma
Client generation does not apply database migrations.

## Missing-relation incidents

If the application reports that a relation does not exist:

1. Confirm that the application's runtime `DATABASE_URL` and the migration
   command target the same production database without printing credentials.
2. Run `npx prisma migrate status`.
3. Check the expected relation directly, for example:

   ```sql
   SELECT to_regclass('public."BisToken"');
   ```

4. If migration status is current but the relation is absent, treat that as
   schema drift and repair it with a new forward migration. Do not rewrite or
   replay an already-applied migration.

`prisma migrate status` checks the recorded migration chain; it is not a full
schema-drift detector. Optional integrations may fail closed or render as
temporarily unavailable when their tables are missing, but that runtime guard
does not replace repairing the production schema.

## Construction and production operational storage

`20261009100000_isolate_production_operational_tables` separates production
photos and site diary configuration. Construction (including Limeni) uses
`sitediaryrecords`, `photos`, `Site.siteDiaryRecordsMap` and its construction
visual documents. Production (including ZTC) uses `ZTCrecords`, `ZtcPhoto`,
`ZtcSiteConfiguration`, `ZtcRecordAudit`, `ZtcRateChangeAudit` and
`ZtcInboundMediaBatch`. Users, organizations, workers, project identities and
flow assignments remain shared. This is storage isolation, not separate
deployments or database servers; shared code still requires regression tests.

The additive migration copies existing production photos and configuration,
preserving IDs, URLs, metadata and timestamps. It does not delete original
rows, change diary record values or transfer files. Unambiguous photo owners
are linked to production diary records; ambiguous historical owners remain
unlinked rather than guessing. Production photo links never reference
construction diary records.

Rollout order:

1. With explicit production-write approval, apply the additive migration.
   The transaction fails atomically if any step fails.
2. Deploy the matching generated Prisma client and application. Until cutover,
   temporary compatibility triggers synchronize the legacy and new production
   photo/configuration stores, so the previous application remains functional.
3. Verify production uploads, gallery reads, rate edits and deletions, plus
   construction gallery behavior. Ensure old deployments and workers are no
   longer serving requests. Do not remove the bridge before this verification.
4. Run `node scripts/finalize-production-storage.cjs` to test the final cutover
   in a rolled-back transaction. With explicit approval, run
   `node scripts/finalize-production-storage.cjs --apply --confirm-new-code-deployed`.
   It locks the affected tables briefly, checks both photo stores and
   configuration copies match, then removes only compatibility triggers and
   functions. Original rows are retained for recovery, but production code no
   longer reads or writes those legacy copies.

After finalization, an old application must not be redeployed without restoring
compatibility and reconciling changes first. Flow reassignment of an existing
project is also a data migration, not just a settings toggle. Do not drop
legacy copies as part of this rollout.
