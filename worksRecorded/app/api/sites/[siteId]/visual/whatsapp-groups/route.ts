import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { readLimitedBody } from "@/flows/default-construction/visual/share-body";
import { requireVisualAccess } from "@/flows/default-construction/visual/store";
import {
	readWhapiProjectGroups,
	readWhapiQrImage,
	updateWhapiProjectGroups,
	WhapiGroupsError,
	whapiGroupActionSchema,
} from "@/flows/default-construction/visual/whapi-groups-store";

type Context = { params: Promise<{ siteId: string }> };
const headers = { "Cache-Control": "private, no-store" };
const maxBody = 24_000;

function jsonError(error: string, status: number) {
	return Response.json({ error }, { status, headers });
}

async function authorize(context: Context) {
	const user = await getKindeServerSession().getUser();
	if (!user) return jsonError("Nepieciešama pierakstīšanās.", 401);
	const { siteId } = await context.params;
	try {
		const { organizationId } = await requireVisualAccess(user.id, siteId);
		return { organizationId, userId: user.id, siteId };
	} catch {
		return jsonError("Projekts nav pieejams.", 403);
	}
}

export async function GET(request: Request, context: Context) {
	const access = await authorize(context);
	if (access instanceof Response) return access;
	const params = new URL(request.url).searchParams;
	try {
		if (params.get("qr") === "1") {
			const image = await readWhapiQrImage(access);
			if (!image) return new Response(null, { status: 404, headers });
			return new Response(image, {
				headers: {
					...headers,
					"Content-Type": "image/png",
					"X-Content-Type-Options": "nosniff",
				},
			});
		}
		return Response.json(
			await readWhapiProjectGroups(access, params.get("manage") === "1"),
			{ headers },
		);
	} catch {
		return jsonError("WhatsApp savienojums šobrīd nav pieejams.", 503);
	}
}

export async function POST(request: Request, context: Context) {
	if (request.headers.get("origin") !== new URL(request.url).origin)
		return jsonError("Pieprasījums nav atļauts.", 403);
	const access = await authorize(context);
	if (access instanceof Response) return access;
	const body = await readLimitedBody(request.body, maxBody).catch(() => null);
	if (!body) return jsonError("Nederīgs pieprasījums.", 400);
	let payload: unknown;
	try {
		payload = JSON.parse(new TextDecoder().decode(body));
	} catch {
		return jsonError("Nederīgs pieprasījums.", 400);
	}
	const action = whapiGroupActionSchema.safeParse(payload);
	if (!action.success) return jsonError("Nederīgs pieprasījums.", 400);
	try {
		return Response.json(await updateWhapiProjectGroups(access, action.data), {
			headers,
		});
	} catch (error) {
		if (error instanceof WhapiGroupsError) return jsonError(error.message, 400);
		return jsonError("WhatsApp savienojums šobrīd nav pieejams.", 503);
	}
}
