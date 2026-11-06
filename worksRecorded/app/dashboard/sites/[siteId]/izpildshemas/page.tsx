import { withRetainedProjectPage } from "@/components/projects/withRetainedProjectPage";
import { requireUser } from "@/lib/utils/requireUser";
import { requireVisualAccess } from "@/flows/default-construction/visual/store";

async function ExecutionDrawingsPage({
	params,
}: {
	params: Promise<{ siteId: string }>;
}) {
	const { siteId } = await params;
	const user = await requireUser();
	await requireVisualAccess(user.id, siteId);
	return null;
}

export default withRetainedProjectPage(ExecutionDrawingsPage, "izpildshemas");
