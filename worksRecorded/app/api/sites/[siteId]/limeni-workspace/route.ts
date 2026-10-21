import { requireVisualAccess } from "@/flows/default-construction/visual/store";
import { getDashboardBisStatus } from "@/lib/bis/dashboard-status";
import { requireUser } from "@/lib/utils/requireUser";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
) {
	try {
		const { siteId } = await params;
		const user = await requireUser();
		const access = await requireVisualAccess(user.id, siteId);
		const [bis, organizationLanguage] = await Promise.all([
			getDashboardBisStatus(user.id, siteId, true),
			getOrganizationLanguageByUserId(user.id),
		]);
		return Response.json(
			{
				siteId,
				userId: user.id,
				organizationId: access.organizationId,
				bisEnabled: bis.enabled,
				organizationLanguage,
			},
			{ headers: { "Cache-Control": "private, no-store" } },
		);
	} catch {
		return Response.json(
			{ error: "Neizdevās ielādēt projekta iestatījumus." },
			{ status: 403 },
		);
	}
}
