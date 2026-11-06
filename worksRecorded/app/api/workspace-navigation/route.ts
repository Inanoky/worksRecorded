import { loadWorkspaceCatalogRevision } from "@/components/projects/workspace-catalog";
import { requireUser } from "@/lib/utils/requireUser";

export async function GET(request: Request) {
	const user = await requireUser().catch(() => null);
	const headers = { "Cache-Control": "private, no-store" };
	if (!user)
		return Response.json({ error: "Unauthorized" }, { status: 401, headers });
	const data = await loadWorkspaceCatalogRevision(user.id);
	const etag = `"${data.scope}:${data.revision}"`;
	if (request.headers.get("if-none-match") === etag)
		return new Response(null, {
			status: 304,
			headers: { ...headers, ETag: etag },
		});
	return Response.json(data, { headers: { ...headers, ETag: etag } });
}
