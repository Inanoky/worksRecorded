import { getWorkspaceAccess } from "@/components/projects/workspace-access";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
) {
	const { siteId } = await params;
	const descriptor = await getWorkspaceAccess(siteId);
	return Response.json(descriptor, {
		headers: { "Cache-Control": "private, no-store" },
	});
}
