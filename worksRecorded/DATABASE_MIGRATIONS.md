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
