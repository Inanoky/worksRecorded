import { timingSafeEqual } from "node:crypto";
import { ingestBrowserWhatsappMessage } from "@/lib/whatsapp-browser-sync/ingest";
import { browserWhatsappIngestSchema } from "@/lib/whatsapp-browser-sync/schema";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request: Request) {
	const configured = process.env.WHATSAPP_BROWSER_SYNC_SECRET?.trim();
	const supplied = request.headers
		.get("authorization")
		?.replace(/^Bearer\s+/i, "")
		.trim();
	if (!configured || !supplied) return false;
	const configuredBuffer = Buffer.from(configured);
	const suppliedBuffer = Buffer.from(supplied);
	return (
		configuredBuffer.length === suppliedBuffer.length &&
		timingSafeEqual(configuredBuffer, suppliedBuffer)
	);
}

export async function POST(request: Request) {
	if (!isAuthorized(request)) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json().catch(() => null);
	const parsed = browserWhatsappIngestSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: "Invalid payload", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}
	const organizationId =
		process.env.WHATSAPP_BROWSER_SYNC_ORGANIZATION_ID?.trim();
	if (!organizationId) {
		return Response.json(
			{ error: "WhatsApp browser sync is not configured" },
			{ status: 503 },
		);
	}
	if (parsed.data.organizationId !== organizationId) {
		return Response.json(
			{ error: "Organization is not allowed" },
			{ status: 403 },
		);
	}

	try {
		const result = await ingestBrowserWhatsappMessage(parsed.data);
		return Response.json(result, {
			status: result.status === "created" ? 201 : 200,
		});
	} catch (error) {
		console.error("WhatsApp browser sync ingestion failed", {
			idempotencyKey: parsed.data.idempotencyKey,
			error: error instanceof Error ? error.message : String(error),
		});
		return Response.json({ error: "Ingestion failed" }, { status: 500 });
	}
}
