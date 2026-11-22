import { createHash } from "node:crypto";
import { z } from "zod";
import { loadWorkspaceAccess } from "@/components/projects/workspace-access";
import { readFimaForma2Workspace } from "@/flows/default-construction/backend/forma2-data-read";
import type { FimaForma2Workspace } from "@/flows/default-construction/lib/forma2-results";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const projectId = z.string().uuid();

export async function GET(request: Request) {
	const project = projectId.safeParse(
		new URL(request.url).searchParams.get("project"),
	);
	if (!project.success)
		return Response.json(
			{ error: "Nederīgs projekts." },
			{ status: 400, headers },
		);
	const siteId = project.data;
	const access = await loadWorkspaceAccess(siteId).catch(() => null);
	if (!access?.descriptor.fimaForma2)
		return Response.json(
			{ error: "Nav piekļuves FIMA projektam." },
			{ status: 403, headers },
		);
	try {
		const workspace: FimaForma2Workspace = {
			siteId,
			organizationLanguage: access.organizationLanguage,
			...(await readFimaForma2Workspace(siteId, {
				siteName: access.descriptor.name,
				bisCaseId: access.bisCaseId,
				siteDiaryRecordsMap: access.siteDiaryRecordsMap,
			})),
		};
		const body = JSON.stringify(workspace);
		const etag = `"${createHash("sha256").update(body).digest("hex")}"`;
		if (request.headers.get("if-none-match") === etag)
			return new Response(null, {
				status: 304,
				headers: { ...headers, ETag: etag },
			});
		return new Response(body, {
			headers: { ...headers, ETag: etag, "Content-Type": "application/json" },
		});
	} catch {
		return Response.json(
			{ error: "Neizdevās ielādēt Forma 2." },
			{ status: 503, headers },
		);
	}
}
