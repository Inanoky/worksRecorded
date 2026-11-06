import { RegisterWorkspaceRoot } from "@/components/projects/ProjectRegistration";
import { fimaAccess } from "@/flows/fima/backend/access";
import { FimaWorkspace } from "@/flows/fima/frontend/FimaWorkspace";

export default async function FimaPage() {
	await fimaAccess();
	return (
		<RegisterWorkspaceRoot href="/dashboard/fima">
			<FimaWorkspace />
		</RegisterWorkspaceRoot>
	);
}
