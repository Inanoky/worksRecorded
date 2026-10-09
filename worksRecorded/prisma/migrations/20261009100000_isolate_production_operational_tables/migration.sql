BEGIN;
SET LOCAL lock_timeout = '10s';
LOCK TABLE photos, "Site" IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE "ZtcSiteConfiguration" (
  "siteId" TEXT NOT NULL PRIMARY KEY REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "siteDiaryRecordsMap" JSONB
);

INSERT INTO "ZtcSiteConfiguration" ("siteId", "siteDiaryRecordsMap")
SELECT s.id, s."siteDiaryRecordsMap" FROM "Site" s
WHERE EXISTS (SELECT 1 FROM "ZTCrecords" r WHERE r."siteId" = s.id)
   OR EXISTS (SELECT 1 FROM "FlowAssignment" a WHERE a."organizationId" = s."organizationId" AND a.enabled AND a."flowModuleKey" IN ('ztc-production', 'default-production'))
   OR s.id = '4c26c435-dd19-49d7-ad60-981eb1eeaeff';

CREATE TABLE "ZtcPhoto" (
  id TEXT NOT NULL PRIMARY KEY,
  "Date" TIMESTAMP(3),
  "URL" TEXT,
  "Comment" TEXT,
  "Location" TEXT,
  "userId" TEXT REFERENCES "User"(id) ON DELETE SET NULL ON UPDATE CASCADE,
  "workerId" TEXT REFERENCES workers(id) ON DELETE SET NULL ON UPDATE CASCADE,
  "fileUrl" TEXT,
  "mediaPurpose" TEXT DEFAULT 'site_diary',
  "diaryRecordId" TEXT REFERENCES "ZTCrecords"(id) ON DELETE SET NULL ON UPDATE CASCADE,
  "siteId" TEXT REFERENCES "Site"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "organizationId" TEXT REFERENCES "Organization"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ZtcPhoto_siteId_Date_idx" ON "ZtcPhoto"("siteId", "Date");
CREATE INDEX "ZtcPhoto_siteId_mediaPurpose_Date_idx" ON "ZtcPhoto"("siteId", "mediaPurpose", "Date");

INSERT INTO "ZtcPhoto" (id, "Date", "URL", "Comment", "Location", "userId", "workerId", "fileUrl", "mediaPurpose", "siteId", "organizationId", "createdAt")
SELECT p.id, p."Date", p."URL", p."Comment", p."Location", p."userId", p."workerId", p."fileUrl", p."mediaPurpose", p."siteId", p."organizationId", p."createdAt"
FROM photos p
WHERE EXISTS (SELECT 1 FROM "ZtcSiteConfiguration" c WHERE c."siteId" = p."siteId")
   OR (p."siteId" IS NULL AND EXISTS (SELECT 1 FROM "ZtcSiteConfiguration" c JOIN "Site" s ON s.id = c."siteId" WHERE s."organizationId" = p."organizationId"));

UPDATE "ZtcPhoto" p SET "diaryRecordId" = links.id
FROM (
  SELECT p.id AS "photoId", min(r.id) AS id FROM "ZtcPhoto" p JOIN "ZTCrecords" r
    ON r."siteId" = p."siteId" AND r."organizationId" IS NOT DISTINCT FROM p."organizationId"
    AND r."workerId" IS NOT DISTINCT FROM p."workerId"
    AND (p."fileUrl" = ANY(r."Photos") OR p."URL" = ANY(r."Photos"))
  GROUP BY p.id HAVING count(*) = 1
) links WHERE p.id = links."photoId";

CREATE FUNCTION sync_production_photo_storage() RETURNS trigger LANGUAGE plpgsql AS $body$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;
  IF TG_TABLE_NAME = 'photos' THEN
    IF TG_OP = 'DELETE' THEN DELETE FROM "ZtcPhoto" WHERE id = OLD.id; RETURN NULL; END IF;
    IF NOT EXISTS (SELECT 1 FROM "ZtcSiteConfiguration" WHERE "siteId" = NEW."siteId")
       AND NOT (NEW."siteId" IS NULL AND EXISTS (SELECT 1 FROM "ZtcSiteConfiguration" c JOIN "Site" s ON s.id = c."siteId" WHERE s."organizationId" = NEW."organizationId")) THEN
      RETURN NULL;
    END IF;
    INSERT INTO "ZtcPhoto" (id, "Date", "URL", "Comment", "Location", "userId", "workerId", "fileUrl", "mediaPurpose", "siteId", "organizationId", "createdAt")
    VALUES (NEW.id, NEW."Date", NEW."URL", NEW."Comment", NEW."Location", NEW."userId", NEW."workerId", NEW."fileUrl", NEW."mediaPurpose", NEW."siteId", NEW."organizationId", NEW."createdAt")
    ON CONFLICT (id) DO UPDATE SET "Date" = EXCLUDED."Date", "URL" = EXCLUDED."URL", "Comment" = EXCLUDED."Comment", "Location" = EXCLUDED."Location", "userId" = EXCLUDED."userId", "workerId" = EXCLUDED."workerId", "fileUrl" = EXCLUDED."fileUrl", "mediaPurpose" = EXCLUDED."mediaPurpose", "siteId" = EXCLUDED."siteId", "organizationId" = EXCLUDED."organizationId";
  ELSE
    IF TG_OP = 'DELETE' THEN DELETE FROM photos WHERE id = OLD.id; RETURN NULL; END IF;
    INSERT INTO photos (id, "Date", "URL", "Comment", "Location", "userId", "workerId", "fileUrl", "mediaPurpose", "siteId", "organizationId", "createdAt")
    VALUES (NEW.id, NEW."Date", NEW."URL", NEW."Comment", NEW."Location", NEW."userId", NEW."workerId", NEW."fileUrl", NEW."mediaPurpose", NEW."siteId", NEW."organizationId", NEW."createdAt")
    ON CONFLICT (id) DO UPDATE SET "Date" = EXCLUDED."Date", "URL" = EXCLUDED."URL", "Comment" = EXCLUDED."Comment", "Location" = EXCLUDED."Location", "userId" = EXCLUDED."userId", "workerId" = EXCLUDED."workerId", "fileUrl" = EXCLUDED."fileUrl", "mediaPurpose" = EXCLUDED."mediaPurpose", "siteId" = EXCLUDED."siteId", "organizationId" = EXCLUDED."organizationId";
  END IF;
  RETURN NULL;
END;
$body$;
CREATE TRIGGER production_photo_compatibility AFTER INSERT OR UPDATE OR DELETE ON photos FOR EACH ROW EXECUTE FUNCTION sync_production_photo_storage();
CREATE TRIGGER production_photo_compatibility AFTER INSERT OR UPDATE OR DELETE ON "ZtcPhoto" FOR EACH ROW EXECUTE FUNCTION sync_production_photo_storage();

CREATE FUNCTION sync_production_site_configuration() RETURNS trigger LANGUAGE plpgsql AS $body$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;
  IF TG_TABLE_NAME = 'Site' THEN
    IF EXISTS (SELECT 1 FROM "ZtcSiteConfiguration" WHERE "siteId" = NEW.id)
       OR EXISTS (SELECT 1 FROM "FlowAssignment" a WHERE a."organizationId" = NEW."organizationId" AND a.enabled AND a."flowModuleKey" IN ('ztc-production', 'default-production')) THEN
      INSERT INTO "ZtcSiteConfiguration" ("siteId", "siteDiaryRecordsMap") VALUES (NEW.id, NEW."siteDiaryRecordsMap")
      ON CONFLICT ("siteId") DO UPDATE SET "siteDiaryRecordsMap" = EXCLUDED."siteDiaryRecordsMap";
    END IF;
  ELSE
    UPDATE "Site" SET "siteDiaryRecordsMap" = NEW."siteDiaryRecordsMap" WHERE id = NEW."siteId" AND "siteDiaryRecordsMap" IS DISTINCT FROM NEW."siteDiaryRecordsMap";
  END IF;
  RETURN NULL;
END;
$body$;
CREATE TRIGGER production_configuration_compatibility AFTER INSERT OR UPDATE OF "siteDiaryRecordsMap" ON "Site" FOR EACH ROW EXECUTE FUNCTION sync_production_site_configuration();
CREATE TRIGGER production_configuration_compatibility AFTER INSERT OR UPDATE ON "ZtcSiteConfiguration" FOR EACH ROW EXECUTE FUNCTION sync_production_site_configuration();

COMMIT;
