-- Supabase pg_net relay for n8n database webhooks.
-- Triggers are installed immediately, but delivery stays disabled until
-- private.n8n_database_webhook_config has enabled = true.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE SCHEMA IF NOT EXISTS "private";

CREATE TABLE IF NOT EXISTS "private"."n8n_database_webhook_config" (
    "id" BOOLEAN NOT NULL DEFAULT true,
    "webhookUrl" TEXT NOT NULL,
    "webhookSecret" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "timeoutMs" INTEGER NOT NULL DEFAULT 2000,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "n8n_database_webhook_config_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "n8n_database_webhook_config_singleton" CHECK ("id" = true),
    CONSTRAINT "n8n_database_webhook_config_timeout_check" CHECK ("timeoutMs" BETWEEN 500 AND 10000),
    CONSTRAINT "n8n_database_webhook_config_url_check" CHECK ("webhookUrl" ~ '^https://')
);

CREATE TABLE IF NOT EXISTS "private"."n8n_database_webhook_deliveries" (
    "id" BIGSERIAL PRIMARY KEY,
    "requestId" BIGINT,
    "schemaName" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "rowId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "n8n_database_webhook_deliveries_createdAt_idx"
    ON "private"."n8n_database_webhook_deliveries" ("createdAt" DESC);

CREATE OR REPLACE FUNCTION "private"."set_n8n_webhook_config_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "set_n8n_webhook_config_updated_at"
ON "private"."n8n_database_webhook_config";

CREATE TRIGGER "set_n8n_webhook_config_updated_at"
BEFORE UPDATE ON "private"."n8n_database_webhook_config"
FOR EACH ROW
EXECUTE FUNCTION "private"."set_n8n_webhook_config_updated_at"();

CREATE OR REPLACE FUNCTION "private"."dispatch_n8n_database_webhook"()
RETURNS TRIGGER AS $$
DECLARE
    webhook_config "private"."n8n_database_webhook_config"%ROWTYPE;
    event_record JSONB;
    old_event_record JSONB;
    payload JSONB;
    headers JSONB;
    request_id BIGINT;
BEGIN
    SELECT *
    INTO webhook_config
    FROM "private"."n8n_database_webhook_config"
    WHERE "id" = true
      AND "enabled" = true;

    IF NOT FOUND THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;

        RETURN NEW;
    END IF;

    event_record := CASE
        WHEN TG_OP = 'DELETE' THEN NULL
        ELSE to_jsonb(NEW)
    END;

    old_event_record := CASE
        WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD)
        ELSE NULL
    END;

    payload := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', event_record,
        'old_record', old_event_record,
        'source', 'worksRecorded.supabase',
        'sent_at', now()
    );

    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-WorksRecorded-Webhook', 'supabase-database'
    );

    IF webhook_config."webhookSecret" IS NOT NULL AND webhook_config."webhookSecret" <> '' THEN
        headers := headers || jsonb_build_object('X-Webhook-Secret', webhook_config."webhookSecret");
    END IF;

    SELECT net.http_post(
        url := webhook_config."webhookUrl",
        body := payload,
        headers := headers,
        timeout_milliseconds := webhook_config."timeoutMs"
    )
    INTO request_id;

    INSERT INTO "private"."n8n_database_webhook_deliveries" (
        "requestId",
        "schemaName",
        "tableName",
        "eventType",
        "rowId"
    )
    VALUES (
        request_id,
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(event_record ->> 'id', old_event_record ->> 'id')
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = "private", "public", "net", "pg_temp";

DROP TRIGGER IF EXISTS "wr_n8n_sitediaryrecords_webhook" ON "public"."sitediaryrecords";
CREATE TRIGGER "wr_n8n_sitediaryrecords_webhook"
AFTER INSERT OR UPDATE OR DELETE ON "public"."sitediaryrecords"
FOR EACH ROW
EXECUTE FUNCTION "private"."dispatch_n8n_database_webhook"();

DROP TRIGGER IF EXISTS "wr_n8n_photos_webhook" ON "public"."photos";
CREATE TRIGGER "wr_n8n_photos_webhook"
AFTER INSERT OR UPDATE OR DELETE ON "public"."photos"
FOR EACH ROW
EXECUTE FUNCTION "private"."dispatch_n8n_database_webhook"();

DROP TRIGGER IF EXISTS "wr_n8n_timelog_webhook" ON "public"."timelog";
CREATE TRIGGER "wr_n8n_timelog_webhook"
AFTER INSERT OR UPDATE OR DELETE ON "public"."timelog"
FOR EACH ROW
EXECUTE FUNCTION "private"."dispatch_n8n_database_webhook"();

DROP TRIGGER IF EXISTS "wr_n8n_bis_material_records_webhook" ON "public"."BISmaterialRecords";
CREATE TRIGGER "wr_n8n_bis_material_records_webhook"
AFTER INSERT OR UPDATE OR DELETE ON "public"."BISmaterialRecords"
FOR EACH ROW
EXECUTE FUNCTION "private"."dispatch_n8n_database_webhook"();

DROP TRIGGER IF EXISTS "wr_n8n_workers_webhook" ON "public"."workers";
CREATE TRIGGER "wr_n8n_workers_webhook"
AFTER INSERT OR UPDATE OR DELETE ON "public"."workers"
FOR EACH ROW
EXECUTE FUNCTION "private"."dispatch_n8n_database_webhook"();
