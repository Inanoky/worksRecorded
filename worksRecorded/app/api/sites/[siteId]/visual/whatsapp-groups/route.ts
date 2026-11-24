import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { ZodError } from "zod";
import { readLimitedBody } from "@/flows/default-construction/visual/share-body";
import { requireVisualAccess } from "@/flows/default-construction/visual/store";
import { WasenderApiError } from "@/flows/default-construction/visual/wasender-connections-api";
import {
	WasenderConnectionError,
	wasenderConnectionId,
} from "@/flows/default-construction/visual/wasender-connections-store";
import {
	readWasenderProjectGroups,
	saveWasenderGroupsSchema,
	saveWasenderProjectGroups,
} from "@/flows/default-construction/visual/wasender-groups-store";

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
	const connectionId = params.get("connectionId") ?? undefined;
	if (connectionId && !wasenderConnectionId.safeParse(connectionId).success)
		return jsonError("Nederīgs savienojums.", 400);
	try {
		return Response.json(
			await readWasenderProjectGroups(
				access,
				params.get("manage") === "1",
				connectionId,
			),
			{ headers },
		);
	} catch (error) {
		console.warn("WaSenderAPI group lookup failed", {
			kind: error instanceof Error ? error.name : "UnknownError",
			status: error instanceof WasenderApiError ? error.status : undefined,
			fields:
				error instanceof ZodError
					? error.issues
							.slice(0, 3)
							.map(({ code, path }) => `${code}:${path.join(".")}`)
					: undefined,
		});
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
	const action = saveWasenderGroupsSchema.safeParse(payload);
	if (!action.success) return jsonError("Nederīgs pieprasījums.", 400);
	try {
		return Response.json(await saveWasenderProjectGroups(access, action.data), {
			headers,
		});
	} catch (error) {
		if (error instanceof WasenderConnectionError)
			return jsonError(error.message, error.status);
		return jsonError("WhatsApp savienojums šobrīd nav pieejams.", 503);
	}
}
