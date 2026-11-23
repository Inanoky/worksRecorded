import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { z } from "zod";
import {
	refreshWasenderTaskSend,
	sendVisualPlanningWhatsAppTask,
	WHATSAPP_TASK_MAX_BODY,
} from "@/flows/default-construction/visual/planning-whatsapp-send";
import { readLimitedBody } from "@/flows/default-construction/visual/share-body";
import { WasenderConnectionError } from "@/flows/default-construction/visual/wasender-connections-store";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
) {
	const user = await getKindeServerSession().getUser();
	if (!user)
		return new Response(null, { status: 401, headers: privateHeaders });
	const sendId = z
		.string()
		.uuid()
		.safeParse(new URL(request.url).searchParams.get("sendId"));
	if (!sendId.success)
		return new Response(null, { status: 400, headers: privateHeaders });
	try {
		const { siteId } = await params;
		const status = await refreshWasenderTaskSend(user.id, siteId, sendId.data);
		return status
			? Response.json(status, { headers: privateHeaders })
			: new Response(null, { status: 404, headers: privateHeaders });
	} catch {
		return new Response(null, { status: 404, headers: privateHeaders });
	}
}

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
	if (Number(request.headers.get("content-length")) > WHATSAPP_TASK_MAX_BODY)
		return Response.json({ error: "Attēli ir pārāk lieli." }, { status: 413 });
	try {
		const { siteId } = await params;
		const bytes = await readLimitedBody(request.body, WHATSAPP_TASK_MAX_BODY);
		const form = await new Response(bytes, {
			headers: { "content-type": request.headers.get("content-type") ?? "" },
		}).formData();
		const files = form.getAll("images");
		if (files.some((file) => typeof file === "string"))
			throw new Error("Invalid files");
		const result = await sendVisualPlanningWhatsAppTask({
			userId: user.id,
			siteId,
			input: {
				planId: form.get("planId"),
				planVersion: Number(form.get("planVersion")),
				recipient: form.get("recipient"),
				groupId: form.get("groupId") ?? undefined,
				groupSender: form.get("groupSender") ?? undefined,
				message: form.get("message"),
				clientRequestId: form.get("clientRequestId"),
				images: JSON.parse(String(form.get("imageMetadata"))),
			},
			files: files as File[],
		});
		return Response.json(result, {
			headers: { "Cache-Control": "no-store" },
		});
	} catch (error) {
		console.error("visual-whatsapp-task: send failed", {
			error: error instanceof Error ? error.message : "unknown",
		});
		return Response.json(
			{
				error:
					error instanceof WasenderConnectionError ||
					(error instanceof Error && error.message.startsWith("Nederīgs"))
						? error.message
						: "Neizdevās nosūtīt WhatsApp darba uzdevumu. Pārbaudiet saglabāto plānu un mēģiniet vēlreiz.",
			},
			{ status: 400 },
		);
	}
}
