import {
	loadConstructionProjectDelta,
	loadConstructionProjectManifest,
	loadConstructionProjectSnapshot,
} from "@/flows/default-construction/backend/construction-project-store";
import { syncProjectRequest } from "@/flows/default-construction/visual/project-sync-route";

export const runtime = "nodejs";
export const maxDuration = 60;
const loaders = {
	manifest: loadConstructionProjectManifest,
	snapshot: loadConstructionProjectSnapshot,
	delta: loadConstructionProjectDelta,
};
export async function GET(
	request: Request,
	context: { params: Promise<{ siteId: string }> },
) {
	return syncProjectRequest(request, context, loaders);
}
export async function POST(
	request: Request,
	context: { params: Promise<{ siteId: string }> },
) {
	return syncProjectRequest(request, context, loaders);
}
