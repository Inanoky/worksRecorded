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
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "public"."Site" t WHERE t.id = ${siteId} AND t."organizationId" = ${organizationId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "public"."Documents" t WHERE t."siteId" = ${siteId} AND t."organizationId" = ${organizationId} AND t."documentType" IN ('limeni-visual-v1', 'limeni-visual-preview-v1')),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "public"."sitediaryrecords" t WHERE t."siteId" = ${siteId} AND t."organizationId" = ${organizationId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "public"."photos" t WHERE t."siteId" = ${siteId} AND t."organizationId" = ${organizationId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "public"."ConstructionPlan" t WHERE t."siteId" = ${siteId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "public"."VisualPlanningContact" t WHERE t."siteId" = ${siteId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "public"."WhatsAppTaskSend" t WHERE t."siteId" = ${siteId} AND t."organizationId" = ${organizationId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "public"."WhatsAppTaskSendItem" t JOIN "public"."WhatsAppTaskSend" s ON s.id = t."sendId" WHERE s."siteId" = ${siteId} AND s."organizationId" = ${organizationId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "public"."analytics" t WHERE t."siteId" = ${siteId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "public"."BISmaterialRecords" t WHERE t."siteId" = ${siteId}),
			(SELECT md5(COALESCE(jsonb_agg(jsonb_build_array(t.id, t."firstName", t."lastName", t.phone, t.status) ORDER BY t.id)::text, '[]')) FROM "public"."User" t WHERE t."organizationId" = ${organizationId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "public"."workers" t WHERE t."organizationId" = ${organizationId} OR (t."organizationId" IS NULL AND t."siteId" IN (SELECT id FROM "public"."Site" WHERE "organizationId" = ${organizationId}))),
			(SELECT t."orgLanguage" FROM "public"."Organization" t WHERE t.id = ${organizationId}),
			(SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) FROM "public"."BisToken" t WHERE t."userId" = ${userId})
		)) AS revision
	`;
	return `project-v3-${process.env.VERCEL_GIT_COMMIT_SHA || "local"}-${rows[0].revision}`;
}
