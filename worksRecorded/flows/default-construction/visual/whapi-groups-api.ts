import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";

const gate = "https://gate.whapi.cloud";
const manager = "https://manager.whapi.cloud";
export const whapiGroupIdSchema = z.string().regex(/^[\d-]{10,31}@g\.us$/);
export const whapiPhoneSchema = z.string().regex(/^\d{8,15}$/);
const channelSchema = z.object({
	id: z.string().min(1),
	token: z.string().min(1),
});
const healthSchema = z.object({
	status: z.object({ text: z.string() }),
	user: z.object({ id: z.string(), phone: z.string().nullish() }).nullish(),
});
const groupSchema = z.object({
	id: whapiGroupIdSchema,
	name: z.string(),
	suspended: z.boolean().optional(),
	terminated: z.boolean().optional(),
});
const groupsSchema = z.object({
	groups: z.array(groupSchema),
	total: z.number().optional(),
});
const sentImageSchema = z.object({
	sent: z.literal(true),
	message: z.object({ id: z.string().min(1) }),
});

export function getWhapiConfig() {
	if (process.env.WHAPI_LIMENI_ENABLED !== "1") return null;
	const partnerToken = process.env.WHAPI_PARTNER_TOKEN;
	const projectId = process.env.WHAPI_LIMENI_PROJECT_ID;
	const encryptionKey = process.env.WHAPI_CHANNEL_ENCRYPTION_KEY;
	if (
		!partnerToken ||
		!projectId ||
		!encryptionKey ||
		!/^[a-f0-9]{64}$/i.test(encryptionKey)
	)
		return null;
	return {
		partnerToken,
		projectId,
		encryptionKey: Buffer.from(encryptionKey, "hex"),
	};
}

export class WhapiRequestError extends Error {
	constructor(readonly status: number) {
		super(`Whapi request failed (${status})`);
	}
}

async function whapiRequest(url: string, token: string, init?: RequestInit) {
	const response = await fetch(url, {
		...init,
		headers: { Authorization: `Bearer ${token}`, ...init?.headers },
		cache: "no-store",
		redirect: "error",
		signal: AbortSignal.timeout(15000),
	});
	if (!response.ok) throw new WhapiRequestError(response.status);
	return response;
}

export function sealWhapiToken(
	token: string,
	key: Buffer,
	connectionId: string,
) {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	cipher.setAAD(Buffer.from(connectionId));
	const ciphertext = Buffer.concat([
		cipher.update(token, "utf8"),
		cipher.final(),
	]);
	return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
		"base64url",
	);
}

export function openWhapiToken(
	sealed: string,
	key: Buffer,
	connectionId: string,
) {
	const data = Buffer.from(sealed, "base64url");
	const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
	decipher.setAAD(Buffer.from(connectionId));
	decipher.setAuthTag(data.subarray(12, 28));
	return Buffer.concat([
		decipher.update(data.subarray(28)),
		decipher.final(),
	]).toString("utf8");
}

export async function createWhapiChannel(
	config: NonNullable<ReturnType<typeof getWhapiConfig>>,
	name: string,
) {
	const response = await whapiRequest(
		`${manager}/channels`,
		config.partnerToken,
		{
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, projectId: config.projectId }),
		},
	);
	const payload: unknown = await response.json();
	const direct = channelSchema.safeParse(payload);
	return direct.success
		? direct.data
		: z.object({ channel: channelSchema }).parse(payload).channel;
}

export async function configureWhapiChannel(token: string) {
	await whapiRequest(`${gate}/settings`, token, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			full_history: false,
			auto_read_messages: false,
			webhooks: [],
		}),
	});
}

export async function whapiHealth(token: string) {
	const health = healthSchema.parse(
		await (await whapiRequest(`${gate}/health`, token)).json(),
	);
	const phone = [
		health.user?.phone?.replace(/^\+/, ""),
		health.user?.id.replace(/@s\.whatsapp\.net$/, ""),
	].find(
		(candidate) => candidate && whapiPhoneSchema.safeParse(candidate).success,
	);
	return { status: health.status.text, phone: phone ?? null };
}

export async function whapiLoginImage(token: string) {
	const response = await whapiRequest(`${gate}/users/login/image`, token, {
		headers: { Accept: "image/png" },
	});
	if (!response.headers.get("content-type")?.startsWith("image/png"))
		throw new Error("Whapi did not return a QR image");
	return response.arrayBuffer();
}

export async function logoutWhapi(token: string) {
	try {
		await whapiRequest(`${gate}/users/logout`, token, { method: "POST" });
	} catch (error) {
		if (!(error instanceof WhapiRequestError && error.status === 409))
			throw error;
	}
}

export async function listWhapiGroups(token: string) {
	const groups = new Map<string, { id: string; name: string }>();
	const seen = new Set<string>();
	const count = 200;
	for (let offset = 0; ; offset += count) {
		const page = groupsSchema.parse(
			await (
				await whapiRequest(
					`${gate}/groups?count=${count}&offset=${offset}`,
					token,
				)
			).json(),
		);
		const before = seen.size;
		for (const group of page.groups) {
			seen.add(group.id);
			if (!group.suspended && !group.terminated)
				groups.set(group.id, {
					id: group.id,
					name: group.name.trim().slice(0, 150) || "Grupa bez nosaukuma",
				});
		}
		if (
			page.groups.length < count ||
			offset + page.groups.length >= (page.total ?? Infinity) ||
			before === seen.size
		)
			break;
	}
	return [...groups.values()].sort((left, right) =>
		left.name.localeCompare(right.name, "lv"),
	);
}

export async function whapiGroup(token: string, groupId: string) {
	const response = await whapiRequest(
		`${gate}/groups/${encodeURIComponent(whapiGroupIdSchema.parse(groupId))}`,
		token,
	);
	const group = groupSchema.parse(await response.json());
	if (group.id !== groupId || group.suspended || group.terminated)
		throw new WhapiRequestError(403);
	return {
		id: group.id,
		name: group.name.trim().slice(0, 150) || "Grupa bez nosaukuma",
	};
}

export async function sendWhapiImage(args: {
	token: string;
	groupId: string;
	image: File;
	caption: string;
}) {
	const body = new FormData();
	body.set("to", whapiGroupIdSchema.parse(args.groupId));
	body.set("media", args.image, "work-task.jpg");
	body.set("caption", args.caption);
	const response = await whapiRequest(`${gate}/messages/image`, args.token, {
		method: "POST",
		body,
	});
	return sentImageSchema.parse(await response.json()).message.id;
}
