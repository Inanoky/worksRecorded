import { withRetainedProjectPage } from "@/components/projects/withRetainedProjectPage";
import { getWorkspaceAccess } from "@/components/projects/workspace-access";
import { readProjectSettings } from "./load-settings";
import { ProjectSettingsView } from "./ProjectSettingsView";

async function SettingsSiteRoute({
	params,
}: {
	params: Promise<{ siteId: string }>;
}) {
	const { siteId } = await params;
	const workspace = await getWorkspaceAccess(siteId);
	if (workspace.visualPreload) return null;
	return <ProjectSettingsView data={await readProjectSettings(workspace)} />;
}

export default withRetainedProjectPage(SettingsSiteRoute, "settings");
