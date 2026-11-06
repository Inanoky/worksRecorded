import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/utils/db";
import { getBisBaseUrl } from "@/server/actions/BIS/service";
import { proposalSchema, type Source } from "../lib/records";
import type {
	FimaWorkspaceDelta,
	FimaWorkspaceVersions,
} from "../lib/workspace-sync";
import { fimaAccess } from "./access";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const knownSchema = z.object({
	revision: digest,
	records: z
		.record(z.string().max(200), digest)
		.refine((r) => Object.keys(r).length <= 5000),
	sites: digest,
	templates: digest,
	operations: digest,
});
const hash = (value: unknown) =>
	createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function readFimaWorkspace(
	siteId?: string,
	input?: FimaWorkspaceVersions,
	activity?: { revision: string },
) {
	const access = await fimaAccess(siteId);
	const known = input ? knownSchema.parse(input) : undefined;
	return prisma.$transaction(
		async (db) => {
			const org = access.organizationId;
			const [rows, parts] = await Promise.all([
				db.$queryRaw<Array<{ id: string; version: string }>>(Prisma.sql`
        SELECT id, md5(to_jsonb(r)::text) AS version FROM "FimaWorkRecord" r
        WHERE "organizationId" = ${org} ${siteId ? Prisma.sql`AND "siteId" = ${siteId}` : Prisma.empty}
        ORDER BY ordinal, id LIMIT 5001
      `),
				db.$queryRaw<
					Array<{ sites: string; templates: string; operations: string }>
				>(Prisma.sql`
        SELECT
        (SELECT md5(COALESCE(jsonb_agg(jsonb_build_array(id,name,"bisCaseId","bisCaseName") ORDER BY name,id)::text,'[]')) FROM "Site" WHERE "organizationId" = ${org}) AS sites,
        (SELECT md5(COALESCE(string_agg(md5(to_jsonb(t)::text),':' ORDER BY "sourceWork",id),'')) FROM "FimaWorkTemplate" t WHERE "organizationId" = ${org}) AS templates,
        (SELECT md5(COALESCE(string_agg(md5(to_jsonb(t)::text),':' ORDER BY "createdAt" DESC,id),'')) FROM (
          SELECT o.id,o."recordId",o.kind,o.status,o.error,o."createdAt" FROM "FimaBisOperation" o
          JOIN "FimaWorkRecord" r ON r.id = o."recordId"
          WHERE o."organizationId" = ${org} ${siteId ? Prisma.sql`AND r."siteId" = ${siteId}` : Prisma.empty}
          ORDER BY o."createdAt" DESC,o.id LIMIT 100
        ) t) AS operations
      `),
			]);
			const code = process.env.VERCEL_GIT_COMMIT_SHA || "local";
			const records = Object.fromEntries(
				rows.slice(0, 5000).map((r) => [r.id, hash([r.version, code])]),
			);
			const part = {
				sites: hash([parts[0].sites, code]),
				templates: hash([parts[0].templates, code]),
				operations: hash([parts[0].operations, code]),
			};
			const bisBase = getBisBaseUrl();
			const cache: FimaWorkspaceVersions = {
				...part,
				records,
				revision: hash([part, records, rows.length > 5000, bisBase]),
			};
			const scope = JSON.stringify([`${access.userId}:${org}`, siteId ?? null]);
			if (activity && activity.revision !== cache.revision)
				return { kind: "changed" as const, scope };
			if (activity) return { kind: "unchanged" as const, scope };
			if (known?.revision === cache.revision)
				return { kind: "unchanged" as const, scope };
			const ids = Object.keys(records).filter(
				(id) => known?.records[id] !== records[id],
			);
			const [changed, sites, templates, operations] = await Promise.all([
				ids.length
					? db.fimaWorkRecord.findMany({
							where: {
								organizationId: org,
								id: { in: ids },
								...(siteId ? { siteId } : {}),
							},
						})
					: [],
				known?.sites === part.sites
					? undefined
					: db.site.findMany({
							where: { organizationId: org },
							select: {
								id: true,
								name: true,
								bisCaseId: true,
								bisCaseName: true,
							},
							orderBy: [{ name: "asc" }, { id: "asc" }],
						}),
				known?.templates === part.templates
					? undefined
					: db.fimaWorkTemplate.findMany({
							where: { organizationId: org },
							orderBy: [{ sourceWork: "asc" }, { id: "asc" }],
						}),
				known?.operations === part.operations
					? undefined
					: db.fimaBisOperation.findMany({
							where: {
								organizationId: org,
								...(siteId ? { record: { siteId } } : {}),
							},
							select: {
								id: true,
								recordId: true,
								kind: true,
								status: true,
								error: true,
								createdAt: true,
							},
							orderBy: [{ createdAt: "desc" }, { id: "asc" }],
							take: 100,
						}),
			]);
			const delta: FimaWorkspaceDelta = {
				scope,
				cache,
				order: Object.keys(records),
				truncated: rows.length > 5000,
				bisBase,
				records: changed.map((r) => ({
					...r,
					proposal: proposalSchema.parse(r.proposal),
					sources: r.sources as unknown as Source[],
					createdAt: undefined,
					updatedAt: r.updatedAt.toISOString(),
				})),
				...(sites ? { sites } : {}),
				...(templates
					? { templates: JSON.parse(JSON.stringify(templates)) }
					: {}),
				...(operations
					? {
							operations: operations.map((o) => ({
								...o,
								createdAt: o.createdAt.toISOString(),
							})),
						}
					: {}),
			};
			return { kind: "delta" as const, delta };
		},
		{
			isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
			timeout: 30000,
		},
	);
}

export async function syncFimaWorkspace(
	siteId?: string,
	known?: FimaWorkspaceVersions,
) {
	const result = await readFimaWorkspace(siteId, known);
	if (result.kind === "changed")
		throw new Error("Unexpected activity response");
	return result;
}
export async function checkFimaWorkspace(
	siteId: string | undefined,
	revision: string,
) {
	digest.parse(revision);
	const result = await readFimaWorkspace(siteId, undefined, { revision });
	if (result.kind === "delta") throw new Error("Unexpected snapshot response");
	return result;
}
