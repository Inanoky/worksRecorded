import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import {
	readProjectBisSettings,
	readProjectSettings,
} from "@/app/dashboard/sites/[siteId]/settings/load-settings";
import { getWorkspaceAccess } from "@/components/projects/workspace-access";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
) {
	const user = await getKindeServerSession().getUser();
	if (!user) return new Response(null, { status: 401, headers });
	const { siteId } = await params;
	const workspace = await getWorkspaceAccess(siteId);
	if (!workspace.visualPreload)
		return new Response(null, { status: 404, headers });
	const part = new URL(request.url).searchParams.get("part");
	if (part === "bis") {
		return Response.json(
			{ bis: await readProjectBisSettings(workspace) },
			{ headers },
		);
	}
	const data =
		part === "base"
			? await readProjectSettings(workspace, { deferBis: true })
			: await readProjectSettings(workspace);
	return Response.json(data, { headers });
}
