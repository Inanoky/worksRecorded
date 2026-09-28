import { NextResponse } from "next/server";
import { type EmailReceivedEvent, Resend } from "resend";
import { enqueueTgemInboundEmail } from "@/lib/tgem-invoice-approval/workflow-client";

function getHeader(request: Request, name: string) {
	const value = request.headers.get(name);
	if (!value) throw new Error(`Missing ${name} header`);
	return value;
}

export async function POST(request: Request) {
	const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
	if (!webhookSecret) {
		return NextResponse.json(
			{ error: "Webhook is not configured" },
			{ status: 500 },
		);
	}

	const payload = await request.text();
	let event: ReturnType<Resend["webhooks"]["verify"]>;

	try {
		const resend = new Resend(process.env.RESEND_API_KEY);
		event = resend.webhooks.verify({
			payload,
			webhookSecret,
			headers: {
				id: getHeader(request, "svix-id"),
				timestamp: getHeader(request, "svix-timestamp"),
				signature: getHeader(request, "svix-signature"),
			},
		});
	} catch {
		return NextResponse.json(
			{ error: "Invalid webhook signature" },
			{ status: 400 },
		);
	}

	if (event.type !== "email.received") {
		return NextResponse.json({ status: "ignored" });
	}

	const receivedEvent = event as EmailReceivedEvent;
	try {
		await enqueueTgemInboundEmail(receivedEvent.data.email_id);

		return NextResponse.json({ status: "queued" });
	} catch {
		return NextResponse.json(
			{ error: "Queue is temporarily unavailable" },
			{ status: 503 },
		);
	}
}
