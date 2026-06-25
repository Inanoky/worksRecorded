CREATE INDEX IF NOT EXISTS "ZTCrecords_worker_org_completed_created_idx"
ON "ZTCrecords" ("workerId", "organizationId", "Date_Custom_2", "createdAt");

CREATE INDEX IF NOT EXISTS "ZTCrecords_org_location_element_idx"
ON "ZTCrecords" ("organizationId", "Location", "Location_Custom_1");

CREATE INDEX IF NOT EXISTS "workers_phone_idx"
ON "workers" ("phone");

CREATE INDEX IF NOT EXISTS "workers_org_phone_idx"
ON "workers" ("organizationId", "phone");
