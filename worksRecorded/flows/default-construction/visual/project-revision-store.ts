import { createHash } from "node:crypto";
import { prisma } from "@/lib/utils/db";
import { projectAccessFailure } from "./project-snapshot-store";
import { requireVisualAccess } from "./store";

const hash = (value: unknown) =>
	createHash("sha256").update(JSON.stringify(value)).digest("hex");
export async function loadProjectManifest(userId: string, siteId: string) {
	const access = await requireVisualAccess(userId, siteId).catch(
		projectAccessFailure,
	);
	const organizationId = access.organizationId;
	return readProjectManifest(userId, siteId, organizationId);
}

export async function readProjectManifest(
	userId: string,
	siteId: string,
	organizationId: string,
) {
	const result = await prisma.$queryRaw<
		Array<{
			sources: Record<string, string>;
			rows: Array<{ id: string; version: string }>;
		}>
	>`
    SELECT jsonb_build_object(
'site',(SELECT md5(COALESCE(string_agg(md5(to_jsonb(t)::text),':' ORDER BY t.id),'')) FROM public."Site" t WHERE t.id = ${siteId} AND t."organizationId" = ${organizationId}),
'documents',(SELECT md5(COALESCE(string_agg(md5(to_jsonb(t)::text),':' ORDER BY t.id),'')) FROM public."Documents" t WHERE t."siteId" = ${siteId} AND t."organizationId" = ${organizationId} AND t."documentType" IN ('limeni-visual-v1','limeni-visual-preview-v1')),
'diary',(SELECT md5(COALESCE(string_agg(md5(to_jsonb(t)::text),':' ORDER BY t.id),'')) FROM public."sitediaryrecords" t WHERE t."siteId" = ${siteId} AND t."organizationId" = ${organizationId}),
'media',(SELECT md5(COALESCE(string_agg(md5(to_jsonb(t)::text),':' ORDER BY t.id),'')) FROM public."photos" t WHERE t."siteId" = ${siteId} AND t."organizationId" = ${organizationId}),
'plans',(SELECT md5(COALESCE(string_agg(md5(to_jsonb(t)::text),':' ORDER BY t.id),'')) FROM public."ConstructionPlan" t WHERE t."siteId" = ${siteId}),
'contacts',(SELECT md5(COALESCE(string_agg(md5(to_jsonb(t)::text),':' ORDER BY t.id),'')) FROM public."VisualPlanningContact" t WHERE t."siteId" = ${siteId}),
'sends',(SELECT md5(COALESCE(string_agg(md5(to_jsonb(t)::text),':' ORDER BY t.id),'')) FROM public."WhatsAppTaskSend" t WHERE t."siteId" = ${siteId} AND t."organizationId" = ${organizationId}),
'sendItems',(SELECT md5(COALESCE(string_agg(md5(to_jsonb(t)::text),':' ORDER BY t.id),'')) FROM public."WhatsAppTaskSendItem" t WHERE t."sendId" IN (SELECT id FROM "WhatsAppTaskSend" WHERE "siteId" = ${siteId} AND "organizationId" = ${organizationId})),
'analytics',(SELECT md5(COALESCE(string_agg(md5(to_jsonb(t)::text),':' ORDER BY t.id),'')) FROM public."analytics" t WHERE t."siteId" = ${siteId}),
'materials',(SELECT md5(COALESCE(string_agg(md5(to_jsonb(t)::text),':' ORDER BY t.id),'')) FROM public."BISmaterialRecords" t WHERE t."siteId" = ${siteId}),
'users',(SELECT md5(COALESCE(string_agg(md5(jsonb_build_array(t.id,t."firstName",t."lastName",t.phone,t.status)::text),':' ORDER BY t.id),'')) FROM public."User" t WHERE t."organizationId" = ${organizationId}),
'workers',(SELECT md5(COALESCE(string_agg(md5(to_jsonb(t)::text),':' ORDER BY t.id),'')) FROM public."workers" t WHERE t."organizationId" = ${organizationId} OR (t."organizationId" IS NULL AND t."siteId" IN (SELECT id FROM "Site" WHERE "organizationId" = ${organizationId}))),
'language',(SELECT md5(COALESCE(string_agg(md5(to_jsonb(t."orgLanguage")::text),':' ORDER BY t.id),'')) FROM public."Organization" t WHERE t.id = ${organizationId}),
'bis',(SELECT md5(COALESCE(string_agg(md5(to_jsonb(t)::text),':' ORDER BY t.id),'')) FROM public."BisToken" t WHERE t."userId" = ${userId}),
      'day',to_char(now() AT TIME ZONE 'Europe/Riga','YYYY-MM-DD')
    ) AS sources,
    (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',r.id,'version',md5(jsonb_build_array(to_jsonb(r),u."firstName",u."lastName",w.name,w.surname)::text)) ORDER BY r."Date" DESC,r."createdAt" DESC,r.id DESC),'[]'::jsonb)
    FROM public.sitediaryrecords r LEFT JOIN public."User" u ON u.id=r."userId" LEFT JOIN public.workers w ON w.id=r."workerId"
    WHERE r."siteId"=${siteId} AND r."organizationId"=${organizationId} AND r."archivedAt" IS NULL) AS rows
  `;
	const raw = result[0];
	const sourceVersions = Object.fromEntries(
		Object.entries(raw.sources).map(([key, value]) => [key, hash(value)]),
	);
	sourceVersions.code = hash(process.env.VERCEL_GIT_COMMIT_SHA || "local");
	const diaryRowVersions = Object.fromEntries(
		raw.rows.map((r) => [r.id, hash([r.version, sourceVersions.code])]),
	);
	return {
		organizationId,
		sourceVersions,
		diaryRowVersions,
		revision: `project-v4-${process.env.VERCEL_GIT_COMMIT_SHA || "local"}-${hash([sourceVersions, diaryRowVersions])}`,
	};
}
export async function loadProjectRevision(userId: string, siteId: string) {
	return (await loadProjectManifest(userId, siteId)).revision;
}
