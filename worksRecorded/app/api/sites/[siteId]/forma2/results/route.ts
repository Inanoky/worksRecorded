import { createHash } from "node:crypto";
import { requireConstructionProjectAccess } from "@/flows/default-construction/backend/construction-project-access";
import { readAuthorizedForma2Results } from "@/flows/default-construction/backend/forma2-data-read";
import { createPerfTrace } from "@/lib/observability/perf";
import { requireUser } from "@/lib/utils/requireUser";

export const runtime = "nodejs";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
) {
	const startedAt = performance.now();
	const trace = createPerfTrace({
		route: "/api/sites/[siteId]/forma2/results",
		category: "api",
	});
	try {
		const { siteId } = await params;
		const user = await trace.measure("auth", () => requireUser());
		const access = await trace.measure("access", () =>
			requireConstructionProjectAccess(user.id, siteId),
		);
		const data = await readAuthorizedForma2Results(siteId, access, trace);
		const organizationLanguage = access.organizationLanguage;
		const body = await trace.measure("serialize", () =>
			JSON.stringify({ data, organizationLanguage }),
		);
		const etag = await trace.measure(
			"hash",
			() => `"${createHash("sha256").update(body).digest("hex")}"`,
		);
		const headers = {
			"Cache-Control": "private, no-cache",
			ETag: etag,
			"Server-Timing": `forma2-results;dur=${(performance.now() - startedAt).toFixed(1)}`,
		};
		if (request.headers.get("if-none-match") === etag) {
			trace.end({
				status: 304,
				extra: { siteId, empty: data.document === null },
			});
			return new Response(null, { status: 304, headers });
		}
		trace.end({
			status: 200,
			extra: { siteId, empty: data.document === null },
		});
		return new Response(body, {
			headers: { ...headers, "Content-Type": "application/json" },
		});
	} catch (error) {
		trace.fail(error, { status: 403 });
		return Response.json(
			{ error: "Neizdevās ielādēt Forma 2." },
			{ status: 403 },
		);
	}
}
