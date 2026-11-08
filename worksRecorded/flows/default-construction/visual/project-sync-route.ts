import { createPerfTrace } from "@/lib/observability/perf";
import { requireUser } from "@/lib/utils/requireUser";
import type { loadLimeniProjectDelta } from "./project-delta-store";
import type { loadProjectManifest } from "./project-revision-store";
import {
	type loadLimeniProjectSnapshot,
	ProjectAccessError,
} from "./project-snapshot-store";
import {
	projectSyncPayload,
	readProjectParts,
	readProjectRowVersions,
} from "./project-sync-server";
export type ProjectSyncLoaders = {
	manifest: (
		userId: string,
		siteId: string,
		trace?: ReturnType<typeof createPerfTrace>,
	) => ReturnType<typeof loadProjectManifest>;
	snapshot: (
		userId: string,
		siteId: string,
		trace?: ReturnType<typeof createPerfTrace>,
		manifest?: Awaited<ReturnType<typeof loadProjectManifest>>,
	) => ReturnType<typeof loadLimeniProjectSnapshot>;
	delta: typeof loadLimeniProjectDelta;
};
export async function syncProjectRequest(
	request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
	loaders: ProjectSyncLoaders,
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
		const manifest = await trace.measure("manifest", () =>
			loaders.manifest(user.id, siteId, trace),
		);
		const revision = manifest.revision;
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
		let known = readProjectParts(request.headers.get("x-project-parts"));
		let knownRows: Record<string, string> | undefined;
		let sources: Record<string, string> | undefined;
		if (request.method === "POST") {
			if (Number(request.headers.get("content-length")) > 2_000_000) {
				trace.end({ status: 413 });
				return Response.json(
					{ error: "Pieprasījums ir pārāk liels." },
					{ status: 413 },
				);
			}
			const text = await trace.measure("requestBody", () => request.text());
			if (text.length > 2_000_000) {
				trace.end({ status: 413 });
				return Response.json(
					{ error: "Pieprasījums ir pārāk liels." },
					{ status: 413 },
				);
			}
			let body: { parts?: unknown; rows?: unknown; sources?: unknown };
			try {
				body = JSON.parse(text);
			} catch {
				trace.end({ status: 400 });
				return Response.json(
					{ error: "Nederīgi sinhronizācijas dati." },
					{ status: 400 },
				);
			}
			known = readProjectParts(JSON.stringify(body?.parts) ?? null, true);
			knownRows = readProjectRowVersions(body?.rows);
			sources = readProjectParts(JSON.stringify(body?.sources) ?? null);
			if (!known || !knownRows) {
				trace.end({ status: 400 });
				return Response.json(
					{ error: "Nederīgi sinhronizācijas dati." },
					{ status: 400 },
				);
			}
		} else if (request.headers.get("x-project-sync") === "records-v1") {
			trace.end({ status: 202, extra: { responseKind: "records-v1" } });
			return new Response(null, {
				status: 202,
				headers: { ...headers, "X-Project-Sync": "records-v1" },
			});
		}
		if (known && knownRows && sources) {
			const payload = await trace.measure("delta", () =>
				loaders.delta(user.id, siteId, manifest, known, knownRows, sources),
			);
			trace.end({ status: 200, extra: { responseKind: "delta" } });
			return Response.json(payload, { headers });
		}
		const snapshot = await trace.measure("snapshot", () =>
			loaders.snapshot(user.id, siteId, trace, manifest),
		);
		headers["Server-Timing"] =
			`project;dur=${(performance.now() - started).toFixed(1)}`;
		const payload = await trace.measure("payload", () =>
			projectSyncPayload(snapshot, revision, known, knownRows),
		);
		payload.diaryRowVersions = manifest.diaryRowVersions;
		trace.end({ status: 200, extra: { responseKind: "snapshot" } });
		return Response.json(
			{ ...payload, sourceVersions: manifest.sourceVersions },
			{ headers },
		);
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
