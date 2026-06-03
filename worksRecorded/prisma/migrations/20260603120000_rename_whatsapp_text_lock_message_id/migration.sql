DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'WhatsappTextLock'
      AND column_name = 'messageSid'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'WhatsappTextLock'
      AND column_name = 'messageId'
  ) THEN
    ALTER TABLE "public"."WhatsappTextLock" RENAME COLUMN "messageSid" TO "messageId";
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'WhatsappTextLock'
      AND column_name = 'messageSid'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'WhatsappTextLock'
      AND column_name = 'messageId'
  ) THEN
    UPDATE "public"."WhatsappTextLock"
    SET "messageId" = "messageSid"
    WHERE "messageId" IS NULL
      AND "messageSid" IS NOT NULL;

    ALTER TABLE "public"."WhatsappTextLock" DROP COLUMN "messageSid";
  END IF;
END $$;
