import { createHash } from "node:crypto";
import { getDefaultConstructionForma2Results } from "@/flows/default-construction/backend/forma2-analytics-actions";
import { requireVisualAccess } from "@/flows/default-construction/visual/store";
import { requireUser } from "@/lib/utils/requireUser";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";

export const runtime = "nodejs";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
) {
	try {
		const { siteId } = await params;
		const user = await requireUser();
		await requireVisualAccess(user.id, siteId);
		const [data, organizationLanguage] = await Promise.all([
			getDefaultConstructionForma2Results(siteId),
			getOrganizationLanguageByUserId(user.id),
		]);
		const body = JSON.stringify({ data, organizationLanguage });
		const etag = `"${createHash("sha256").update(body).digest("hex")}"`;
		const headers = { "Cache-Control": "private, no-cache", ETag: etag };
		if (request.headers.get("if-none-match") === etag)
			return new Response(null, { status: 304, headers });
		return new Response(body, {
			headers: { ...headers, "Content-Type": "application/json" },
		});
	} catch {
		return Response.json(
			{ error: "Neizdevās ielādēt Forma 2." },
			{ status: 403 },
		);
	}
}
