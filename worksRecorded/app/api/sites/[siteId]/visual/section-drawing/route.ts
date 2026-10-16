import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { readSectionDrawing } from "@/flows/default-construction/visual/section-drawing-store";
import { requireVisualAccess } from "@/flows/default-construction/visual/store";
import { prisma } from "@/lib/utils/db";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
) {
	const user = await getKindeServerSession().getUser();
	if (!user) return new Response(null, { status: 401 });
	try {
		const { siteId } = await params;
		const access = await requireVisualAccess(user.id, siteId);
		const site = await prisma.site.findFirst({
			where: { id: siteId, organizationId: access.organizationId },
			select: { name: true },
		});
		const section = new URL(request.url).searchParams.get("section");
		const drawing =
			site && section ? await readSectionDrawing(site.name, section) : null;
		if (!drawing) return new Response(null, { status: 404 });
		return new Response(new Uint8Array(drawing.bytes), {
			headers: {
				"Content-Type": "image/png",
				"Cache-Control": "private, no-store",
				"X-Content-Type-Options": "nosniff",
			},
		});
	} catch {
		return new Response(null, { status: 404 });
	}
}
