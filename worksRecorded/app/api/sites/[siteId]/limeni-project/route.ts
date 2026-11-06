import { loadLimeniProjectDelta } from "@/flows/default-construction/visual/project-delta-store";
import { loadProjectManifest } from "@/flows/default-construction/visual/project-revision-store";
import { loadLimeniProjectSnapshot } from "@/flows/default-construction/visual/project-snapshot-store";
import { syncProjectRequest } from "@/flows/default-construction/visual/project-sync-route";
export const runtime = "nodejs";
export const maxDuration = 60;
const loaders = {
	manifest: loadProjectManifest,
	snapshot: loadLimeniProjectSnapshot,
	delta: loadLimeniProjectDelta,
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
