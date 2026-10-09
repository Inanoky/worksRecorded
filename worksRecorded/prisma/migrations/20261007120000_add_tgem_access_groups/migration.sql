CREATE TABLE "TgemAccessGroup" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "permissions" TEXT[] NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TgemAccessGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TgemOrganizationAccessMembership" (
  "groupId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TgemOrganizationAccessMembership_pkey" PRIMARY KEY ("groupId", "userId")
);

CREATE TABLE "TgemSiteAccessMembership" (
  "groupId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TgemSiteAccessMembership_pkey" PRIMARY KEY ("groupId", "siteId", "userId")
);

CREATE TABLE "TgemAccessAuditEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "groupId" TEXT,
  "siteId" TEXT,
  "targetUserId" TEXT,
  "actorUserId" TEXT,
  "eventType" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TgemAccessAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TgemAccessGroup_organizationId_name_key" ON "TgemAccessGroup"("organizationId", "name");
CREATE INDEX "TgemAccessGroup_organizationId_name_idx" ON "TgemAccessGroup"("organizationId", "name");
CREATE INDEX "TgemOrganizationAccessMembership_userId_idx" ON "TgemOrganizationAccessMembership"("userId");
CREATE INDEX "TgemSiteAccessMembership_siteId_userId_idx" ON "TgemSiteAccessMembership"("siteId", "userId");
CREATE INDEX "TgemSiteAccessMembership_userId_idx" ON "TgemSiteAccessMembership"("userId");
CREATE INDEX "TgemAccessAuditEvent_organizationId_createdAt_idx" ON "TgemAccessAuditEvent"("organizationId", "createdAt");
CREATE INDEX "TgemAccessAuditEvent_groupId_createdAt_idx" ON "TgemAccessAuditEvent"("groupId", "createdAt");
CREATE INDEX "TgemAccessAuditEvent_siteId_createdAt_idx" ON "TgemAccessAuditEvent"("siteId", "createdAt");
CREATE INDEX "TgemAccessAuditEvent_targetUserId_createdAt_idx" ON "TgemAccessAuditEvent"("targetUserId", "createdAt");

ALTER TABLE "TgemAccessGroup" ADD CONSTRAINT "TgemAccessGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TgemOrganizationAccessMembership" ADD CONSTRAINT "TgemOrganizationAccessMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TgemAccessGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TgemOrganizationAccessMembership" ADD CONSTRAINT "TgemOrganizationAccessMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TgemSiteAccessMembership" ADD CONSTRAINT "TgemSiteAccessMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TgemAccessGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TgemSiteAccessMembership" ADD CONSTRAINT "TgemSiteAccessMembership_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TgemSiteAccessMembership" ADD CONSTRAINT "TgemSiteAccessMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TgemAccessAuditEvent" ADD CONSTRAINT "TgemAccessAuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TgemAccessAuditEvent" ADD CONSTRAINT "TgemAccessAuditEvent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TgemAccessGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TgemAccessAuditEvent" ADD CONSTRAINT "TgemAccessAuditEvent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TgemAccessAuditEvent" ADD CONSTRAINT "TgemAccessAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "TgemAccessGroup" ("id", "organizationId", "name", "permissions", "createdByUserId", "createdAt", "updatedAt")
SELECT
  'tgem-access-basic-' || md5(assignment."organizationId"),
  assignment."organizationId",
  'Basic member',
  ARRAY['invoice.view', 'invoice.edit_basic', 'invoice.assign_project', 'invoice.submit_approval']::TEXT[],
  'system:migration',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "FlowAssignment" assignment
WHERE assignment."flowModuleKey" = 'tgem-invoice-approval' AND assignment."enabled" = true;

INSERT INTO "TgemAccessGroup" ("id", "organizationId", "name", "permissions", "createdByUserId", "createdAt", "updatedAt")
SELECT
  'tgem-access-approver-' || md5(assignment."organizationId"),
  assignment."organizationId",
  'Approver',
  ARRAY['invoice.view', 'invoice.approve']::TEXT[],
  'system:migration',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "FlowAssignment" assignment
WHERE assignment."flowModuleKey" = 'tgem-invoice-approval' AND assignment."enabled" = true;

INSERT INTO "TgemAccessGroup" ("id", "organizationId", "name", "permissions", "createdByUserId", "createdAt", "updatedAt")
SELECT
  'tgem-access-admin-' || md5(assignment."organizationId"),
  assignment."organizationId",
  'Administrator',
  ARRAY[
    'invoice.view',
    'invoice.edit_basic',
    'invoice.assign_project',
    'invoice.split',
    'invoice.submit_approval',
    'invoice.approve',
    'invoice.archive',
    'invoice.mark_paid'
  ]::TEXT[],
  'system:migration',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "FlowAssignment" assignment
WHERE assignment."flowModuleKey" = 'tgem-invoice-approval' AND assignment."enabled" = true;

INSERT INTO "TgemOrganizationAccessMembership" ("groupId", "userId", "createdByUserId", "createdAt")
SELECT
  'tgem-access-basic-' || md5(user_record."organizationId"),
  user_record."id",
  'system:migration',
  CURRENT_TIMESTAMP
FROM "User" user_record
JOIN "FlowAssignment" assignment ON assignment."organizationId" = user_record."organizationId"
WHERE assignment."flowModuleKey" = 'tgem-invoice-approval'
  AND assignment."enabled" = true
  AND user_record."status" = 'active';
