INSERT INTO "TgemAccessAuditEvent" (
  "id",
  "organizationId",
  "groupId",
  "eventType",
  "payload",
  "createdAt"
)
SELECT
  'tgem-audit-backfill-group-' || md5(access_group."id"),
  access_group."organizationId",
  access_group."id",
  'group_created',
  jsonb_build_object(
    'source', 'migration_backfill',
    'name', access_group."name",
    'permissions', to_jsonb(access_group."permissions"),
    'recordedCreatedByUserId', access_group."createdByUserId"
  ),
  access_group."createdAt"
FROM "TgemAccessGroup" access_group
WHERE NOT EXISTS (
  SELECT 1
  FROM "TgemAccessAuditEvent" audit_event
  WHERE audit_event."groupId" = access_group."id"
    AND audit_event."eventType" = 'group_created'
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "TgemAccessAuditEvent" (
  "id",
  "organizationId",
  "groupId",
  "targetUserId",
  "eventType",
  "payload",
  "createdAt"
)
SELECT
  'tgem-audit-backfill-org-membership-' || md5(
    membership."groupId" || ':' || membership."userId"
  ),
  access_group."organizationId",
  membership."groupId",
  membership."userId",
  'organization_membership_added',
  jsonb_build_object(
    'source', 'migration_backfill',
    'recordedCreatedByUserId', membership."createdByUserId"
  ),
  membership."createdAt"
FROM "TgemOrganizationAccessMembership" membership
JOIN "TgemAccessGroup" access_group ON access_group."id" = membership."groupId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "TgemAccessAuditEvent" audit_event
  WHERE audit_event."groupId" = membership."groupId"
    AND audit_event."targetUserId" = membership."userId"
    AND audit_event."eventType" = 'organization_membership_added'
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "TgemAccessAuditEvent" (
  "id",
  "organizationId",
  "groupId",
  "siteId",
  "targetUserId",
  "eventType",
  "payload",
  "createdAt"
)
SELECT
  'tgem-audit-backfill-site-membership-' || md5(
    membership."groupId" || ':' || membership."siteId" || ':' || membership."userId"
  ),
  access_group."organizationId",
  membership."groupId",
  membership."siteId",
  membership."userId",
  'site_membership_added',
  jsonb_build_object(
    'source', 'migration_backfill',
    'recordedCreatedByUserId', membership."createdByUserId"
  ),
  membership."createdAt"
FROM "TgemSiteAccessMembership" membership
JOIN "TgemAccessGroup" access_group ON access_group."id" = membership."groupId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "TgemAccessAuditEvent" audit_event
  WHERE audit_event."groupId" = membership."groupId"
    AND audit_event."siteId" = membership."siteId"
    AND audit_event."targetUserId" = membership."userId"
    AND audit_event."eventType" = 'site_membership_added'
)
ON CONFLICT ("id") DO NOTHING;
