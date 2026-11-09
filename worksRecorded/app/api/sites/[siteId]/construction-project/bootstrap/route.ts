import { loadConstructionProjectBootstrap } from "@/flows/default-construction/backend/construction-project-bootstrap";
import { ProjectAccessError } from "@/flows/default-construction/visual/project-access-error";
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
		route: new URL(request.url).pathname.replace(siteId, "[siteId]"),
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
		const snapshot = await trace.measure("bootstrap", () =>
			loadConstructionProjectBootstrap(user.id, siteId, trace),
		);
		trace.end({
			status: 200,
			extra: { responseKind: "construction-bootstrap" },
		});
		return Response.json(
			{ kind: "construction-bootstrap", snapshot },
			{
				headers: {
					"Cache-Control": "private, no-store",
					"Server-Timing": `project-bootstrap;dur=${(
						performance.now() - started
					).toFixed(1)}`,
				},
			},
		);
	} catch (error) {
		const status = error instanceof ProjectAccessError ? 403 : 503;
		trace.fail(error, { status });
		return Response.json(
			{ error: "Neizdevās ielādēt projektu." },
			{ status, headers: { "Cache-Control": "private, no-store" } },
		);
	}
}
