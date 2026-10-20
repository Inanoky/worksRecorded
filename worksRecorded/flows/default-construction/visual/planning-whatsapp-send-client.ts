import type { PlanningImage } from "./planning-image";
import { preparePlanningImageForSend } from "./planning-share-client";

export type PlanningWhatsAppSendResult = {
	sendId: string;
	status: "sent" | "partial" | "failed" | "processing";
	items: Array<{
		ordinal: number;
		page: number;
		section: string | null;
		status: string;
		metaMessageId: string | null;
		error: string | null;
	}>;
};

export async function sendPlanningWhatsAppTask(args: {
	siteId: string;
	planId: string;
	planVersion: number;
	recipient: string;
	message: string;
	clientRequestId: string;
	images: PlanningImage[];
	signal: AbortSignal;
}) {
	const form = new FormData();
	form.set("planId", args.planId);
	form.set("planVersion", String(args.planVersion));
	form.set("recipient", args.recipient);
	form.set("message", args.message);
	form.set("clientRequestId", args.clientRequestId);
	form.set(
		"imageMetadata",
		JSON.stringify(
			args.images.map(({ page, section }) => ({
				page,
				...(section ? { section } : {}),
			})),
		),
	);
	for (const [index, image] of args.images.entries()) {
		const blob = await preparePlanningImageForSend(image.blob, args.signal);
		form.append("images", blob, `work-task-${index + 1}.jpg`);
	}
	const response = await fetch(
		`/api/sites/${encodeURIComponent(args.siteId)}/visual/whatsapp-task`,
		{ method: "POST", body: form, signal: args.signal },
	);
	const payload = await response.json().catch(() => null);
	if (!response.ok)
		throw new Error(
			typeof payload?.error === "string"
				? payload.error
				: "Neizdevās nosūtīt WhatsApp darba uzdevumu.",
		);
	return payload as PlanningWhatsAppSendResult;
}
