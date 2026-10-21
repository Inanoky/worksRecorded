import { prisma } from "@/lib/utils/db";
import { projectAccessFailure } from "./project-snapshot-store";
import { requireVisualAccess } from "./store";

export async function loadProjectRevision(userId: string, siteId: string) {
	const access = await requireVisualAccess(userId, siteId).catch(
		projectAccessFailure,
	);
	const organizationId = access.organizationId;
	const rows = await prisma.$queryRaw<Array<{ revision: string }>>`
		SELECT md5(concat_ws(':',
			to_char(now() AT TIME ZONE 'Europe/Riga', 'YYYY-MM-DD'),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "Site" t WHERE t.id = ${siteId} AND t."organizationId" = ${organizationId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "Documents" t WHERE t."siteId" = ${siteId} AND t."organizationId" = ${organizationId} AND t."documentType" IN ('limeni-visual-v1', 'limeni-visual-preview-v1')),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "sitediaryrecords" t WHERE t."siteId" = ${siteId} AND t."organizationId" = ${organizationId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "photos" t WHERE t."siteId" = ${siteId} AND t."organizationId" = ${organizationId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "ConstructionPlan" t WHERE t."siteId" = ${siteId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "VisualPlanningContact" t WHERE t."siteId" = ${siteId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "WhatsAppTaskSend" t WHERE t."siteId" = ${siteId} AND t."organizationId" = ${organizationId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "WhatsAppTaskSendItem" t JOIN "WhatsAppTaskSend" s ON s.id = t."sendId" WHERE s."siteId" = ${siteId} AND s."organizationId" = ${organizationId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "analytics" t WHERE t."siteId" = ${siteId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "BISmaterialRecords" t WHERE t."siteId" = ${siteId}),
			(SELECT md5(COALESCE(jsonb_agg(jsonb_build_array(t.id, t."firstName", t."lastName", t.phone, t.status) ORDER BY t.id)::text, '[]')) FROM "User" t WHERE t."organizationId" = ${organizationId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "workers" t WHERE t."organizationId" = ${organizationId} OR (t."organizationId" IS NULL AND t."siteId" IN (SELECT id FROM "Site" WHERE "organizationId" = ${organizationId}))),
			(SELECT t."orgLanguage" FROM "Organization" t WHERE t.id = ${organizationId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "BisToken" t WHERE t."userId" = ${userId})
		)) AS revision
	`;
	return `project-v2-${rows[0].revision}`;
}
