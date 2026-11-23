import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { readLimitedBody } from "@/flows/default-construction/visual/share-body";
import { requireVisualAccess } from "@/flows/default-construction/visual/store";
import { WasenderApiError } from "@/flows/default-construction/visual/wasender-connections-api";
import {
	readOwnedWasenderConnection,
	readOwnedWasenderQr,
	readWasenderConnections,
	updateWasenderConnection,
	WasenderConnectionError,
	wasenderActionSchema,
	wasenderConnectionId,
} from "@/flows/default-construction/visual/wasender-connections-store";

type Context = { params: Promise<{ siteId: string }> };
const headers = { "Cache-Control": "private, no-store" };

function jsonError(error: string, status: number) {
	return Response.json({ error }, { status, headers });
}

function serviceError(error: unknown) {
	if (error instanceof WasenderConnectionError)
		return jsonError(error.message, error.status);
	if (error instanceof WasenderApiError && error.status === 402)
		return jsonError(
			"WaSenderAPI abonements vai izmēģinājums nav aktīvs.",
			503,
		);
	return jsonError("WaSenderAPI savienojums šobrīd nav pieejams.", 503);
}

async function authorize(context: Context) {
	const user = await getKindeServerSession().getUser();
	if (!user) return jsonError("Nepieciešama pierakstīšanās.", 401);
	try {
		const { siteId } = await context.params;
		const { organizationId } = await requireVisualAccess(user.id, siteId);
		return { organizationId, userId: user.id };
	} catch {
		return jsonError("Projekts nav pieejams.", 403);
	}
}

export async function GET(request: Request, context: Context) {
	const owner = await authorize(context);
	if (owner instanceof Response) return owner;
	const params = new URL(request.url).searchParams;
	const qr = params.get("qr");
	const id = qr ?? params.get("id");
	try {
		if (id === null)
			return Response.json(await readWasenderConnections(owner), { headers });
		if (!wasenderConnectionId.safeParse(id).success)
			return jsonError("Nederīgs savienojums.", 400);
		if (qr === null)
			return Response.json(await readOwnedWasenderConnection(owner, id), {
				headers,
			});
		const image = await readOwnedWasenderQr(owner, id);
		return image
			? new Response(image, {
					headers: {
						...headers,
						"Content-Type": "image/png",
						"X-Content-Type-Options": "nosniff",
					},
				})
			: new Response(null, { status: 404, headers });
	} catch (error) {
		return serviceError(error);
	}
}

export async function POST(request: Request, context: Context) {
	if (request.headers.get("origin") !== new URL(request.url).origin)
		return jsonError("Pieprasījums nav atļauts.", 403);
	const owner = await authorize(context);
	if (owner instanceof Response) return owner;
	const body = await readLimitedBody(request.body, 2048).catch(() => null);
	if (!body) return jsonError("Nederīgs pieprasījums.", 400);
	let value: unknown;
	try {
		value = JSON.parse(new TextDecoder().decode(body));
	} catch {
		return jsonError("Nederīgs pieprasījums.", 400);
	}
	const action = wasenderActionSchema.safeParse(value);
	if (!action.success)
		return jsonError(
			"Pārbaudiet numuru un izmantojiet starptautisko formātu, piemēram, +371 20 000 000.",
			400,
		);
	try {
		const connection = await updateWasenderConnection(owner, action.data);
		return Response.json({ connection }, { headers });
	} catch (error) {
		return serviceError(error);
	}
}
