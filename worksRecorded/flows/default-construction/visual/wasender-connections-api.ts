import "server-only";
import { z } from "zod";

const api = "https://wasenderapi.com/api";
const sessionsPath = "/whatsapp-sessions";

export const wasenderPhone = z
	.string()
	.max(36)
	.transform((value) => value.replace(/[\s()-]/g, ""))
	.pipe(z.string().regex(/^\+[1-9]\d{7,14}$/));

const sessionSchema = z.object({
	id: z.number().int().positive().max(2_147_483_647),
	name: z.string(),
	phone_number: z.string(),
	status: z.string().transform((value) => value.toLowerCase()),
});

const success = z.object({ success: z.literal(true) });

export class WasenderApiError extends Error {
	constructor(
		readonly status: number,
		readonly sessionLimit = false,
		readonly retryAfterMs?: number,
	) {
		super(`WaSenderAPI request failed (${status})`);
	}
}

export function getWasenderAccessToken() {
	return process.env.WASENDER_LIMENI_ACCESS_TOKEN?.trim() || null;
}

function rateLimitDelay(headers: Headers, payload: unknown) {
	const body = z
		.object({ retry_after: z.number().nonnegative() })
		.safeParse(payload);
	const retryAfter = headers.get("Retry-After")?.trim();
	const retryAfterMs = retryAfter
		? /^\d+(\.\d+)?$/.test(retryAfter)
			? Number(retryAfter) * 1000
			: Date.parse(retryAfter) - Date.now()
		: 0;
	const windowResetMs = Number(headers.get("X-RateLimit-Reset")) * 1000;
	const dailyResetMs =
		headers.get("X-RateLimit-Daily-Remaining") === "0"
			? Number(headers.get("X-RateLimit-Daily-Reset")) * 1000
			: 0;
	return (
		Math.max(
			0,
			...[
				body.success ? body.data.retry_after * 1000 : 0,
				retryAfterMs,
				windowResetMs,
				dailyResetMs,
			].filter(Number.isFinite),
		) || undefined
	);
}

async function request(path: string, token: string, init?: RequestInit) {
	const response = await fetch(api + path, {
		...init,
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
			...init?.headers,
		},
		redirect: "error",
		cache: "no-store",
		signal: AbortSignal.timeout(12000),
	});
	const data: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		const error = z
			.object({ message: z.string().optional(), error: z.string().optional() })
			.safeParse(data);
		throw new WasenderApiError(
			response.status,
			[400, 403, 422].includes(response.status) &&
				error.success &&
				/session limit|maximum number of (?:whatsapp )?sessions/i.test(
					error.data.message ?? error.data.error ?? "",
				),
			response.status === 429
				? rateLimitDelay(response.headers, data)
				: undefined,
		);
	}
	return data;
}

export async function listWasenderSessions(token: string) {
	return success
		.extend({ data: z.array(sessionSchema) })
		.parse(await request(sessionsPath, token)).data;
}

export async function createWasenderSession(
	token: string,
	name: string,
	phone: string,
) {
	return success.extend({ data: sessionSchema }).parse(
		await request(sessionsPath, token, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name,
				phone_number: phone,
				account_protection: true,
				log_messages: false,
				read_incoming_messages: false,
				webhook_enabled: false,
			}),
		}),
	).data;
}

export async function readWasenderSession(token: string, id: number) {
	return success
		.extend({
			data: sessionSchema.extend({ api_key: z.string().min(1).nullish() }),
		})
		.parse(await request(`${sessionsPath}/${id}`, token)).data;
}

export async function readWasenderLinkedPhone(sessionKey: string) {
	const { data } = success
		.extend({ data: z.object({ id: z.string() }) })
		.parse(await request("/user", sessionKey));
	const match = /^(\d{8,15})(?::\d+)?@s\.whatsapp\.net$/.exec(data.id);
	return match ? `+${match[1]}` : null;
}

export async function readWasenderSessionStatus(sessionKey: string) {
	return z
		.object({ status: z.string().transform((value) => value.toLowerCase()) })
		.parse(await request("/status", sessionKey)).status;
}

export async function connectWasenderSession(token: string, id: number) {
	return success
		.extend({
			data: z.object({
				status: z.string().transform((value) => value.toLowerCase()),
			}),
		})
		.parse(
			await request(`${sessionsPath}/${id}/connect`, token, { method: "POST" }),
		).data.status;
}

export async function readWasenderQr(token: string, id: number) {
	return success
		.extend({ data: z.object({ qrCode: z.string().min(1).max(2048) }) })
		.parse(await request(`${sessionsPath}/${id}/qrcode`, token)).data.qrCode;
}

export async function disconnectWasenderSession(token: string, id: number) {
	success.parse(
		await request(`${sessionsPath}/${id}/disconnect`, token, {
			method: "POST",
		}),
	);
}

export async function removeWasenderSession(token: string, id: number) {
	await request(`${sessionsPath}/${id}`, token, { method: "DELETE" });
}

export const wasenderGroupId = z.string().regex(/^[\d-]{10,31}@g\.us$/);
export const wasenderGroups = z.array(
	z.object({ id: wasenderGroupId, name: z.string() }),
);
const messageId = z
	.union([z.string().regex(/^\d+$/), z.number().int().positive().safe()])
	.transform(String);

const groupRows = z.array(z.unknown());
const groupPage = success.extend({
	data: z.union([
		groupRows,
		z.object({
			items: groupRows,
			pagination: z.object({
				page: z.number().int().positive(),
				totalPages: z.number().int().nonnegative(),
			}),
		}),
	]),
});
const groupEntry = z.object({
	jid: wasenderGroupId.optional().catch(undefined),
	id: wasenderGroupId.optional().catch(undefined),
	name: z.string().optional().catch(undefined),
	subject: z.string().optional().catch(undefined),
});

export async function listWasenderGroups(token: string) {
	const groups = new Map<string, { id: string; name: string }>();
	let page = 1;
	while (true) {
		const path = page === 1 ? "/groups" : `/groups?paginated=true&page=${page}`;
		const { data } = groupPage.parse(await request(path, token));
		const rows = Array.isArray(data) ? data : data.items;
		for (const row of rows) {
			const entry = groupEntry.safeParse(row);
			if (!entry.success) continue;
			const id = entry.data.jid ?? entry.data.id;
			if (!id) continue;
			const name = entry.data.name?.trim() || entry.data.subject?.trim();
			groups.set(id, {
				id,
				name: name?.slice(0, 150) || "Grupa bez nosaukuma",
			});
		}
		if (Array.isArray(data)) break;
		if (data.pagination.page !== page)
			throw new Error("WaSenderAPI returned an unexpected group page");
		if (page >= data.pagination.totalPages) break;
		page++;
	}
	return Array.from(groups.values()).sort((a, b) =>
		a.name.localeCompare(b.name, "lv"),
	);
}

export async function sendWasenderGroupImage(
	token: string,
	to: string,
	text: string,
	imageUrl: string,
) {
	return success.extend({ data: z.object({ msgId: messageId }) }).parse(
		await request("/send-message", token, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ to, text, imageUrl }),
		}),
	).data.msgId;
}

export async function readWasenderMessageStatus(token: string, id: string) {
	const { data } = success
		.extend({ data: z.object({ status: z.number().int(), msgId: messageId }) })
		.parse(await request(`/messages/${encodeURIComponent(id)}/info`, token));
	if (data.msgId !== id)
		throw new Error("WaSenderAPI returned a different message");
	return data.status;
}
