import { withRetainedProjectPage } from "@/components/projects/withRetainedProjectPage";
import { getWorkspaceAccess } from "@/components/projects/workspace-access";
import { getDefaultConstructionForma2Results } from "@/flows/default-construction/backend/forma2-analytics-actions";
import { DefaultConstructionForma2View } from "@/flows/default-construction/frontend/DefaultConstructionForma2View";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";

async function AnalyticsPage({
	params,
}: {
	params: Promise<{ siteId: string }>;
}) {
	const { siteId } = await params;
	const workspace = await getWorkspaceAccess(siteId);
	if (workspace.visualPreload || workspace.constructionWorkspace) return null;
	const [organizationLanguage, data] = await Promise.all([
		getOrganizationLanguageByUserId(workspace.userId),
		getDefaultConstructionForma2Results(siteId),
	]);
	return (
		<DefaultConstructionForma2View
			siteId={siteId}
			data={data}
			organizationLanguage={organizationLanguage}
		/>
	);
}

export default withRetainedProjectPage(AnalyticsPage, "analytics");
