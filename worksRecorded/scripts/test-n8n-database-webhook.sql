-- Run this in Supabase SQL Editor after enabling private.n8n_database_webhook_config.
-- It sends a direct pg_net request without creating app data, then shows recent responses.

SELECT net.http_post(
    url := (
        SELECT "webhookUrl"
        FROM "private"."n8n_database_webhook_config"
        WHERE "id" = true
          AND "enabled" = true
    ),
    body := jsonb_build_object(
        'type', 'TEST',
        'table', 'manual',
        'schema', 'public',
        'record', jsonb_build_object('id', 'manual-test', 'createdAt', now()),
        'old_record', NULL,
        'source', 'worksRecorded.supabase',
        'sent_at', now()
    ),
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-WorksRecorded-Webhook', 'supabase-database',
        'X-Webhook-Secret', (
            SELECT COALESCE("webhookSecret", '')
            FROM "private"."n8n_database_webhook_config"
            WHERE "id" = true
              AND "enabled" = true
        )
    ),
    timeout_milliseconds := 2000
) AS "requestId";

SELECT
    "id",
    "status_code",
    "error_msg",
    "created",
    LEFT("content", 500) AS "contentPreview"
FROM net._http_response
ORDER BY "created" DESC
LIMIT 10;
