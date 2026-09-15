BEGIN;
LOCK TABLE "SbStommeProgressReport" IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "SbStommeProgressReport") THEN
    RAISE EXCEPTION 'Report table contains data; preserve it before removal';
  END IF;
END $$;
DROP TABLE "SbStommeProgressReport";
COMMIT;
