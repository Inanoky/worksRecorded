LOCK TABLE photos, "ZtcPhoto", "Site", "ZtcSiteConfiguration" IN SHARE ROW EXCLUSIVE MODE;

DO $body$
BEGIN
  IF EXISTS (
    SELECT 1 FROM photos p WHERE
      (EXISTS (SELECT 1 FROM "ZtcSiteConfiguration" c WHERE c."siteId" = p."siteId")
       OR (p."siteId" IS NULL AND EXISTS (SELECT 1 FROM "ZtcSiteConfiguration" c JOIN "Site" s ON s.id = c."siteId" WHERE s."organizationId" = p."organizationId")))
      AND NOT EXISTS (SELECT 1 FROM "ZtcPhoto" z WHERE z.id = p.id AND (to_jsonb(z) - 'diaryRecordId') = (to_jsonb(p) - 'diaryRecordId'))
  ) OR EXISTS (
    SELECT 1 FROM "ZtcPhoto" z WHERE NOT EXISTS (SELECT 1 FROM photos p WHERE p.id = z.id AND (to_jsonb(z) - 'diaryRecordId') = (to_jsonb(p) - 'diaryRecordId'))
  ) THEN RAISE EXCEPTION 'Photo stores differ; cutover refused'; END IF;
  IF EXISTS (
    SELECT 1 FROM "ZtcSiteConfiguration" c JOIN "Site" s ON s.id = c."siteId"
    WHERE c."siteDiaryRecordsMap" IS DISTINCT FROM s."siteDiaryRecordsMap"
  ) THEN RAISE EXCEPTION 'Configuration stores differ; cutover refused'; END IF;
END;
$body$;

DROP TRIGGER production_photo_compatibility ON photos;
DROP TRIGGER production_photo_compatibility ON "ZtcPhoto";
DROP TRIGGER production_configuration_compatibility ON "Site";
DROP TRIGGER production_configuration_compatibility ON "ZtcSiteConfiguration";
DROP FUNCTION sync_production_photo_storage();
DROP FUNCTION sync_production_site_configuration();
