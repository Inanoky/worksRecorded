import { fimaAccess } from "@/flows/fima/backend/access";
import { FimaWorkspace } from "@/flows/fima/frontend/FimaWorkspace";

export default async function FimaPage() {
	await fimaAccess();
	return <FimaWorkspace />;
}
