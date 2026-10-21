import { loadProjectRevision } from "@/flows/default-construction/visual/project-revision-store";
import {
	loadLimeniProjectSnapshot,
	ProjectAccessError,
} from "@/flows/default-construction/visual/project-snapshot-store";
import {
	projectSyncPayload,
	readProjectParts,
} from "@/flows/default-construction/visual/project-sync-server";
import { requireUser } from "@/lib/utils/requireUser";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
) {
	const started = performance.now();
	const user = await requireUser().catch(() => null);
	if (!user)
		return Response.json(
			{ error: "Unauthorized" },
			{ status: 401, headers: { "Cache-Control": "private, no-store" } },
		);
	try {
		const { siteId } = await params;
		const revision = await loadProjectRevision(user.id, siteId);
		const etag = `"${revision}"`;
		const headers = {
			"Cache-Control": "private, no-cache",
			ETag: etag,
			"Server-Timing": `project;dur=${(performance.now() - started).toFixed(1)}`,
		};
		if (request.headers.get("if-none-match") === etag)
			return new Response(null, { status: 304, headers });
		const snapshot = await loadLimeniProjectSnapshot(user.id, siteId);
		headers["Server-Timing"] =
			`project;dur=${(performance.now() - started).toFixed(1)}`;
		return Response.json(
			projectSyncPayload(
				snapshot,
				revision,
				readProjectParts(request.headers.get("x-project-parts")),
			),
			{ headers },
		);
	} catch (error) {
		return Response.json(
			{ error: "Neizdevās ielādēt projektu." },
			{
				status: error instanceof ProjectAccessError ? 403 : 503,
				headers: { "Cache-Control": "private, no-store" },
			},
		);
	}
}
