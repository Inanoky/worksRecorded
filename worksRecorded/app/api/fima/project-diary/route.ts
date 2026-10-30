import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { z } from "zod";
import {
	getFimaDiaryRevision,
	loadFimaDiaryDelta,
} from "@/flows/default-construction/backend/fima-diary-workspace";
import { getDashboardBisStatus } from "@/lib/bis/dashboard-status";
import { createFimaDiaryStream } from "@/lib/fima/diary-response";
import {
	getOrganizationLanguageByUserId,
	orgCheck,
} from "@/server/actions/shared-actions";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
const projectSchema = z.string().uuid();
const digest = z.string().regex(/^[0-9a-f]{64}$/);
const bodySchema = z.object({
	project: projectSchema,
	known: z
		.object({
			configVersion: digest,
			versions: z
				.record(projectSchema, digest)
				.refine((value) => Object.keys(value).length <= 20000),
		})
		.optional(),
});
async function scope(siteId: string) {
	const { getUser } = getKindeServerSession();
	const user = await getUser();
	if (!user)
		return {
			error: Response.json({ error: "Unauthorized" }, { status: 401, headers }),
		};
	const site = await orgCheck(user.id, siteId);
	if (!site || !site.organizationId)
		return {
			error: Response.json({ error: "Forbidden" }, { status: 403, headers }),
		};
	return { user, organizationId: site.organizationId };
}
export async function GET(request: Request) {
	const parsed = projectSchema.safeParse(
		new URL(request.url).searchParams.get("project"),
	);
	if (!parsed.success)
		return Response.json(
			{ error: "Invalid project" },
			{ status: 400, headers },
		);
	const allowed = await scope(parsed.data);
	if (allowed.error) return allowed.error;
	try {
		const revision = await getFimaDiaryRevision(
			allowed.organizationId,
			parsed.data,
		);
		const etag = `"${revision}"`;
		return request.headers.get("if-none-match") === etag
			? new Response(null, { status: 304, headers: { ...headers, ETag: etag } })
			: Response.json({ revision }, { headers: { ...headers, ETag: etag } });
	} catch {
		return Response.json(
			{ error: "Neizdevās pārbaudīt projekta izmaiņas." },
			{ status: 503, headers },
		);
	}
}
export async function POST(request: Request) {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success)
		return Response.json(
			{ error: "Invalid request" },
			{ status: 400, headers },
		);
	const allowed = await scope(parsed.data.project);
	if (allowed.error) return allowed.error;
	try {
		const [delta, language, bis] = await Promise.all([
			loadFimaDiaryDelta(
				allowed.organizationId,
				parsed.data.project,
				parsed.data.known,
			),
			parsed.data.known
				? null
				: getOrganizationLanguageByUserId(allowed.user.id),
			parsed.data.known
				? null
				: getDashboardBisStatus(allowed.user.id, parsed.data.project, true),
		]);
		return new Response(
			createFimaDiaryStream({
				...delta,
				...(parsed.data.known
					? {}
					: {
							organizationLanguage: language,
							bisEnabled: bis?.enabled ?? false,
						}),
			}),
			{
				headers: {
					...headers,
					"Content-Type": "application/json; charset=utf-8",
				},
			},
		);
	} catch {
		return Response.json(
			{ error: "Neizdevās ielādēt projekta izmaiņas." },
			{ status: 503, headers },
		);
	}
}
