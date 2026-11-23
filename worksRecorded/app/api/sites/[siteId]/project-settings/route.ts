import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { readProjectSettings } from "@/app/dashboard/sites/[siteId]/settings/load-settings";
import { getWorkspaceAccess } from "@/components/projects/workspace-access";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
) {
	const user = await getKindeServerSession().getUser();
	if (!user) return new Response(null, { status: 401, headers });
	const { siteId } = await params;
	const workspace = await getWorkspaceAccess(siteId);
	if (!workspace.visualPreload)
		return new Response(null, { status: 404, headers });
	return Response.json(await readProjectSettings(workspace), { headers });
}
