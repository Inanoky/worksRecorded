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
	) {
		super(`WaSenderAPI request failed (${status})`);
	}
}

export function getWasenderAccessToken() {
	return process.env.WASENDER_LIMENI_ACCESS_TOKEN?.trim() || null;
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
