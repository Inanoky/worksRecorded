import { loadProjectRevision } from "@/flows/default-construction/visual/project-revision-store";
import {
	loadLimeniProjectSnapshot,
	ProjectAccessError,
} from "@/flows/default-construction/visual/project-snapshot-store";
import {
	projectSyncPayload,
	readProjectParts,
} from "@/flows/default-construction/visual/project-sync-server";
import { createPerfTrace } from "@/lib/observability/perf";
import { requireUser } from "@/lib/utils/requireUser";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
) {
	const started = performance.now();
	const { siteId } = await params;
	const trace = createPerfTrace({
		route: "/api/sites/[siteId]/limeni-project",
		category: "api",
		siteId,
	});
	const user = await trace.measure("auth", () =>
		requireUser().catch(() => null),
	);
	if (!user) {
		trace.end({ status: 401 });
		return Response.json(
			{ error: "Unauthorized" },
			{ status: 401, headers: { "Cache-Control": "private, no-store" } },
		);
	}
	try {
		const revision = await trace.measure("revision", () =>
			loadProjectRevision(user.id, siteId),
		);
		const etag = `"${revision}"`;
		const headers = {
			"Cache-Control": "private, no-cache",
			ETag: etag,
			"Server-Timing": `project;dur=${(performance.now() - started).toFixed(1)}`,
		};
		if (request.headers.get("if-none-match") === etag) {
			trace.end({ status: 304, extra: { notModified: true } });
			return new Response(null, { status: 304, headers });
		}
		const snapshot = await trace.measure("snapshot", () =>
			loadLimeniProjectSnapshot(user.id, siteId, trace),
		);
		const payload = await trace.measure("payload", () =>
			projectSyncPayload(
				snapshot,
				revision,
				readProjectParts(request.headers.get("x-project-parts")),
			),
		);
		headers["Server-Timing"] =
			`project;dur=${(performance.now() - started).toFixed(1)}`;
		trace.end({ status: 200 });
		return Response.json(payload, { headers });
	} catch (error) {
		const status = error instanceof ProjectAccessError ? 403 : 503;
		trace.fail(error, { status });
		return Response.json(
			{ error: "Neizdevās ielādēt projektu." },
			{
				status,
				headers: { "Cache-Control": "private, no-store" },
			},
		);
	}
}
