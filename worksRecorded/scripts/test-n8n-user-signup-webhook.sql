-- Run this in Supabase SQL Editor after enabling private.n8n_database_webhook_config.
-- It creates one disposable active user so the User INSERT trigger sends the
-- reduced signup payload to n8n, then removes the disposable row.

INSERT INTO "public"."User" (
    "id",
    "email",
    "phone",
    "firstName",
    "lastName",
    "profileImage",
    "status"
)
VALUES (
    'n8n-test-user',
    'n8n-test@example.com',
    '+37120000000',
    'TestName',
    'TestSurname',
    '',
    'active'
)
ON CONFLICT ("id") DO UPDATE
SET
    "email" = EXCLUDED."email",
    "phone" = EXCLUDED."phone",
    "firstName" = EXCLUDED."firstName",
    "lastName" = EXCLUDED."lastName",
    "profileImage" = EXCLUDED."profileImage",
    "status" = EXCLUDED."status";

DELETE FROM "public"."User"
WHERE "id" = 'n8n-test-user';

SELECT *
FROM "private"."n8n_database_webhook_deliveries"
ORDER BY "createdAt" DESC
LIMIT 20;

SELECT
    "id",
    "status_code",
    "error_msg",
    "created",
    LEFT("content", 500) AS "contentPreview"
FROM net._http_response
ORDER BY "created" DESC
LIMIT 10;
