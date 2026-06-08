# n8n Supabase Database Webhooks

This migration installs a pg_net trigger relay for these tables:

- `public.sitediaryrecords`
- `public.photos`
- `public.timelog`
- `public."BISmaterialRecords"`
- `public.workers`

The triggers are inert until this singleton config row is enabled:

```sql
INSERT INTO "private"."n8n_database_webhook_config" (
    "id",
    "webhookUrl",
    "webhookSecret",
    "enabled"
)
VALUES (
    true,
    'https://n8n.nexgem.studio/webhook/worksrecorded/supabase-db-event',
    'replace-with-a-long-random-secret',
    true
)
ON CONFLICT ("id") DO UPDATE
SET
    "webhookUrl" = EXCLUDED."webhookUrl",
    "webhookSecret" = EXCLUDED."webhookSecret",
    "enabled" = EXCLUDED."enabled";
```

Apply:

```bash
cd /Users/dz465/Documents/web-projects/worksRecorded/worksRecorded
npx prisma migrate deploy
```

Test direct pg_net delivery by running:

```sql
-- scripts/test-n8n-database-webhook.sql
```

Inspect recent deliveries:

```sql
SELECT *
FROM "private"."n8n_database_webhook_deliveries"
ORDER BY "createdAt" DESC
LIMIT 20;
```

Inspect recent HTTP responses:

```sql
SELECT
    "id",
    "status_code",
    "error_msg",
    "created",
    LEFT("content", 500) AS "contentPreview"
FROM net._http_response
ORDER BY "created" DESC
LIMIT 10;
```

The n8n Webhook Trigger should use `POST`. Check the incoming `X-Webhook-Secret` header before doing real work in the workflow.
