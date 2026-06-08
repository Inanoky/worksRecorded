-- Limit n8n database webhooks to active user signups and restrict the
-- User payload to the fields n8n needs.

DROP TRIGGER IF EXISTS "wr_n8n_sitediaryrecords_webhook" ON "public"."sitediaryrecords";
DROP TRIGGER IF EXISTS "wr_n8n_photos_webhook" ON "public"."photos";
DROP TRIGGER IF EXISTS "wr_n8n_timelog_webhook" ON "public"."timelog";
DROP TRIGGER IF EXISTS "wr_n8n_bis_material_records_webhook" ON "public"."BISmaterialRecords";
DROP TRIGGER IF EXISTS "wr_n8n_workers_webhook" ON "public"."workers";
DROP TRIGGER IF EXISTS "wr_n8n_user_signup_webhook" ON "public"."User";

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

    IF TG_TABLE_SCHEMA = 'public' AND TG_TABLE_NAME = 'User' AND TG_OP = 'INSERT' THEN
        event_record := jsonb_build_object(
            'name', NEW."firstName",
            'surname', NEW."lastName",
            'email', NEW."email",
            'phone_number', NEW."phone",
            'supabase_id', NEW."id"
        );
        old_event_record := NULL;
    ELSE
        event_record := CASE
            WHEN TG_OP = 'DELETE' THEN NULL
            ELSE to_jsonb(NEW)
        END;

        old_event_record := CASE
            WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD)
            ELSE NULL
        END;
    END IF;

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
        COALESCE(
            event_record ->> 'id',
            event_record ->> 'supabase_id',
            old_event_record ->> 'id',
            old_event_record ->> 'supabase_id'
        )
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = "private", "public", "net", "pg_temp";

CREATE TRIGGER "wr_n8n_user_signup_webhook"
AFTER INSERT ON "public"."User"
FOR EACH ROW
WHEN (NEW."status" = 'active')
EXECUTE FUNCTION "private"."dispatch_n8n_database_webhook"();
