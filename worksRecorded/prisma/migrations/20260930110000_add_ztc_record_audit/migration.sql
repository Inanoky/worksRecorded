CREATE TABLE "ZtcRecordAudit" (
  "id" BIGSERIAL PRIMARY KEY,
  "recordId" TEXT NOT NULL,
  "siteId" TEXT,
  "organizationId" TEXT,
  "operation" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "actorId" TEXT,
  "correlationId" TEXT,
  "step" TEXT,
  "changedFields" TEXT[] NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "context" JSONB NOT NULL,
  "databaseUser" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX "ZtcRecordAudit_recordId_id_idx" ON "ZtcRecordAudit" ("recordId", "id");
CREATE INDEX "ZtcRecordAudit_siteId_createdAt_idx" ON "ZtcRecordAudit" ("siteId", "createdAt");
CREATE INDEX "ZtcRecordAudit_correlationId_idx" ON "ZtcRecordAudit" ("correlationId");
ALTER TABLE "ZtcRecordAudit" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ZtcRecordAudit" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE "ZtcRecordAudit_id_seq" FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.audit_ztc_record_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  previous_row JSONB;
  next_row JSONB;
  row_identity JSONB;
  event_context JSONB;
  changed TEXT[];
BEGIN
  IF TG_OP <> 'INSERT' THEN previous_row := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN next_row := to_jsonb(NEW); END IF;
  IF TG_OP = 'UPDATE' AND previous_row = next_row THEN RETURN NEW; END IF;
  row_identity := COALESCE(next_row, previous_row);
  event_context := COALESCE(NULLIF(current_setting('app.ztc_audit_context', true), '')::jsonb, '{}'::jsonb);
  SELECT COALESCE(array_agg(key ORDER BY key), ARRAY[]::TEXT[]) INTO changed
  FROM jsonb_object_keys(COALESCE(previous_row, '{}'::jsonb) || COALESCE(next_row, '{}'::jsonb)) AS fields(key)
  WHERE previous_row -> key IS DISTINCT FROM next_row -> key;
  INSERT INTO public."ZtcRecordAudit" (
    "recordId", "siteId", "organizationId", "operation", "source", "actorId",
    "correlationId", "step", "changedFields", "before", "after", "context", "databaseUser"
  ) VALUES (
    row_identity ->> 'id', row_identity ->> 'siteId', row_identity ->> 'organizationId', TG_OP,
    COALESCE(event_context ->> 'source', 'database'), event_context ->> 'actorId',
    event_context ->> 'correlationId', event_context ->> 'step', changed,
    previous_row, next_row, event_context, session_user
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER ztc_record_audit AFTER INSERT OR UPDATE OR DELETE ON "ZTCrecords"
FOR EACH ROW EXECUTE FUNCTION public.audit_ztc_record_change();

CREATE FUNCTION public.prevent_ztc_audit_changes() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ZTC record history is append-only';
END;
$$;
CREATE TRIGGER ztc_record_audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON "ZtcRecordAudit"
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_ztc_audit_changes();
