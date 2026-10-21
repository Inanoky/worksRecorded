ALTER TABLE "WhatsAppTaskSend"
ADD CONSTRAINT "WhatsAppTaskSend_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "ConstructionPlan"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "WhatsAppTaskSend_plan_fkey_idx"
ON "WhatsAppTaskSend"("planId");

UPDATE "WhatsAppTaskSend" AS send
SET
  "status" = CASE
    WHEN item_status."failedCount" = item_status."itemCount" THEN 'failed'
    ELSE 'partial'
  END,
  "completedAt" = COALESCE(send."completedAt", CURRENT_TIMESTAMP)
FROM (
  SELECT
    "sendId",
    COUNT(*) AS "itemCount",
    COUNT(*) FILTER (WHERE "status" = 'failed') AS "failedCount"
  FROM "WhatsAppTaskSendItem"
  GROUP BY "sendId"
  HAVING COUNT(*) FILTER (WHERE "status" = 'failed') > 0
) AS item_status
WHERE send."id" = item_status."sendId";
