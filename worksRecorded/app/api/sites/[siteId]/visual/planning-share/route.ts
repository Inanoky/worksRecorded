import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import {
	publicWorkPath,
	SHARE_MAX_BODY,
} from "@/flows/default-construction/visual/planning-share-model";
import { publishVisualPlanningShare } from "@/flows/default-construction/visual/planning-share-store";
import { readLimitedBody } from "@/flows/default-construction/visual/share-body";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
) {
	if (request.headers.get("origin") !== new URL(request.url).origin)
		return Response.json(
			{ error: "Pieprasījums nav atļauts." },
			{ status: 403 },
		);
	const user = await getKindeServerSession().getUser();
	if (!user)
		return Response.json(
			{ error: "Nepieciešama pierakstīšanās." },
			{ status: 401 },
		);
	if (Number(request.headers.get("content-length")) > SHARE_MAX_BODY)
		return Response.json({ error: "Attēli ir pārāk lieli." }, { status: 413 });
	try {
		const { siteId } = await params;
		const bytes = await readLimitedBody(request.body, SHARE_MAX_BODY);
		const form = await new Response(bytes, {
			headers: { "content-type": request.headers.get("content-type") ?? "" },
		}).formData();
		const files = form.getAll("images");
		if (files.some((file) => typeof file === "string"))
			throw new Error("Invalid files");
		const result = await publishVisualPlanningShare(
			user.id,
			siteId,
			{
				planId: form.get("planId"),
				version: Number(form.get("version")),
				pages: JSON.parse(String(form.get("pages"))),
			},
			files as File[],
		);
		return Response.json(
			{ token: result.token, path: publicWorkPath(result.token) },
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch {
		console.error("visual-planning-share: publication failed");
		return Response.json(
			{
				error:
					"Neizdevās kopīgot zonas attēlu. Pārbaudiet, vai plāns ir saglabāts, un mēģiniet vēlreiz.",
			},
			{ status: 400 },
		);
	}
}
