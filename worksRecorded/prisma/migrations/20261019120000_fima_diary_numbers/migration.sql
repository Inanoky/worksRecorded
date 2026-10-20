BEGIN;

LOCK TABLE "Site" IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE "sitediaryrecords" ADD COLUMN "fimaNumber" INTEGER;

CREATE SEQUENCE "sitediaryrecords_fimaNumber_seq" AS INTEGER;
ALTER SEQUENCE "sitediaryrecords_fimaNumber_seq" OWNED BY "sitediaryrecords"."fimaNumber";

WITH numbered AS (
    SELECT record.id, ROW_NUMBER() OVER (ORDER BY record."createdAt", record.id)::INTEGER AS number
    FROM "sitediaryrecords" record
    JOIN "Site" site ON site.id = record."siteId"
    WHERE site."siteDiaryRecordsMap" #> '{otherSettings,fimaCollaboration}' = 'true'::jsonb
)
UPDATE "sitediaryrecords" record
SET "fimaNumber" = numbered.number
FROM numbered
WHERE record.id = numbered.id;

SELECT setval(
    '"sitediaryrecords_fimaNumber_seq"',
    COALESCE(MAX("fimaNumber"), 1),
    MAX("fimaNumber") IS NOT NULL
) FROM "sitediaryrecords";

CREATE UNIQUE INDEX "sitediaryrecords_fimaNumber_key" ON "sitediaryrecords"("fimaNumber");
ALTER TABLE "sitediaryrecords" ADD CONSTRAINT "sitediaryrecords_fimaNumber_positive" CHECK ("fimaNumber" > 0);

CREATE FUNCTION assign_fima_diary_number() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD."fimaNumber" IS NOT NULL THEN
            NEW."fimaNumber" := OLD."fimaNumber";
            RETURN NEW;
        END IF;
    END IF;
    IF EXISTS (
        SELECT 1 FROM "Site"
        WHERE id = NEW."siteId"
        AND "siteDiaryRecordsMap" #> '{otherSettings,fimaCollaboration}' = 'true'::jsonb
    ) THEN
        NEW."fimaNumber" := nextval('"sitediaryrecords_fimaNumber_seq"');
    ELSE
        NEW."fimaNumber" := NULL;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER assign_fima_diary_number
BEFORE INSERT OR UPDATE ON "sitediaryrecords"
FOR EACH ROW EXECUTE FUNCTION assign_fima_diary_number();

CREATE FUNCTION number_newly_enabled_fima_diary() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE "sitediaryrecords" SET "fimaNumber" = NULL
    WHERE "siteId" = NEW.id AND "fimaNumber" IS NULL;
    RETURN NEW;
END;
$$;

CREATE TRIGGER number_newly_enabled_fima_diary
AFTER UPDATE OF "siteDiaryRecordsMap" ON "Site"
FOR EACH ROW
WHEN (
    NEW."siteDiaryRecordsMap" #> '{otherSettings,fimaCollaboration}' = 'true'::jsonb
    AND (OLD."siteDiaryRecordsMap" #> '{otherSettings,fimaCollaboration}') IS DISTINCT FROM 'true'::jsonb
)
EXECUTE FUNCTION number_newly_enabled_fima_diary();

COMMIT;
