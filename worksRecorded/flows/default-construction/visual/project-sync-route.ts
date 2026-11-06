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
	manifest: typeof loadProjectManifest;
	snapshot: typeof loadLimeniProjectSnapshot;
	delta: typeof loadLimeniProjectDelta;
};
export async function syncProjectRequest(
	request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
	loaders: ProjectSyncLoaders,
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
		const manifest = await loaders.manifest(user.id, siteId);
		const revision = manifest.revision;
		const etag = `"${revision}"`;
		const headers = {
			"Cache-Control": "private, no-cache",
			ETag: etag,
			"Server-Timing": `project;dur=${(performance.now() - started).toFixed(1)}`,
		};
		if (request.headers.get("if-none-match") === etag)
			return new Response(null, { status: 304, headers });
		let known = readProjectParts(request.headers.get("x-project-parts"));
		let knownRows: Record<string, string> | undefined;
		let sources: Record<string, string> | undefined;
		if (request.method === "POST") {
			if (Number(request.headers.get("content-length")) > 2_000_000)
				return Response.json(
					{ error: "Pieprasījums ir pārāk liels." },
					{ status: 413 },
				);
			const text = await request.text();
			if (text.length > 2_000_000)
				return Response.json(
					{ error: "Pieprasījums ir pārāk liels." },
					{ status: 413 },
				);
			let body: { parts?: unknown; rows?: unknown; sources?: unknown };
			try {
				body = JSON.parse(text);
			} catch {
				return Response.json(
					{ error: "Nederīgi sinhronizācijas dati." },
					{ status: 400 },
				);
			}
			known = readProjectParts(JSON.stringify(body?.parts) ?? null, true);
			knownRows = readProjectRowVersions(body?.rows);
			sources = readProjectParts(JSON.stringify(body?.sources) ?? null);
			if (!known || !knownRows)
				return Response.json(
					{ error: "Nederīgi sinhronizācijas dati." },
					{ status: 400 },
				);
		} else if (request.headers.get("x-project-sync") === "records-v1") {
			return new Response(null, {
				status: 202,
				headers: { ...headers, "X-Project-Sync": "records-v1" },
			});
		}
		if (known && knownRows && sources) {
			const payload = await loaders.delta(
				user.id,
				siteId,
				manifest,
				known,
				knownRows,
				sources,
			);
			return Response.json(payload, { headers });
		}
		const snapshot = await loaders.snapshot(user.id, siteId);
		headers["Server-Timing"] =
			`project;dur=${(performance.now() - started).toFixed(1)}`;
		const payload = projectSyncPayload(snapshot, revision, known, knownRows);
		payload.diaryRowVersions = manifest.diaryRowVersions;
		return Response.json(
			{ ...payload, sourceVersions: manifest.sourceVersions },
			{ headers },
		);
	} catch (error) {
		const status = error instanceof ProjectAccessError ? 403 : 503;
		return Response.json(
			{ error: "Neizdevās ielādēt projektu." },
			{
				status,
				headers: { "Cache-Control": "private, no-store" },
			},
		);
	}
}
