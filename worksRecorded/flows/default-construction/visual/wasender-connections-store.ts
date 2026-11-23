import "server-only";
import { randomUUID } from "node:crypto";
import type { WasenderWhatsAppConnection } from "@prisma/client";
import { toBuffer } from "qrcode";
import { z } from "zod";
import { prisma } from "@/lib/utils/db";
import {
	connectWasenderSession,
	createWasenderSession,
	disconnectWasenderSession,
	getWasenderAccessToken,
	listWasenderSessions,
	readWasenderLinkedPhone,
	readWasenderQr,
	readWasenderSession,
	readWasenderSessionStatus,
	removeWasenderSession,
	WasenderApiError,
	wasenderPhone,
} from "./wasender-connections-api";
import type {
	WasenderConnection,
	WasenderConnectionStatus,
	WasenderConnections,
} from "./wasender-connections-client";

type Owner = { organizationId: string; userId: string };
type Connection = WasenderWhatsAppConnection;
type Session = Awaited<ReturnType<typeof readWasenderSession>>;
const provisionGraceMs = 60_000;

export const wasenderConnectionId = z.string().uuid();
export const wasenderActionSchema = z.discriminatedUnion("action", [
	z.object({ action: z.literal("add"), phone: wasenderPhone }).strict(),
	z.object({ action: z.literal("connect"), id: wasenderConnectionId }).strict(),
	z
		.object({ action: z.literal("disconnect"), id: wasenderConnectionId })
		.strict(),
	z.object({ action: z.literal("remove"), id: wasenderConnectionId }).strict(),
]);

export class WasenderConnectionError extends Error {
	constructor(
		message: string,
		readonly status = 409,
	) {
		super(message);
	}
}

function view({ id, phone }: Connection, status: WasenderConnectionStatus) {
	return { id, phone, status } satisfies WasenderConnection;
}

function nameFor(row: Connection) {
	return `WorksRecorded Limeni ${row.id}`;
}

function matchesSession(row: Connection, session: Omit<Session, "api_key">) {
	const number = session.phone_number.trim();
	const phone = wasenderPhone.safeParse(
		number.startsWith("+") ? number : `+${number}`,
	);
	return (
		session.name === nameFor(row) && phone.success && phone.data === row.phone
	);
}

function isMissing(error: unknown) {
	return error instanceof WasenderApiError && error.status === 404;
}

async function findOwnedConnection(owner: Owner, id: string) {
	const row = await prisma.wasenderWhatsAppConnection.findFirst({
		where: { ...owner, id },
	});
	if (!row) throw new WasenderConnectionError("Numurs nav pieejams.", 404);
	return row;
}

async function providerSession(token: string, row: Connection) {
	if (row.providerSessionId === null) return null;
	const session = await readWasenderSession(token, row.providerSessionId).catch(
		(error: unknown) => {
			if (isMissing(error)) return null;
			throw error;
		},
	);
	if (!session || !matchesSession(row, session)) return null;
	return session;
}

async function connectionStatus(row: Connection, session: Session) {
	const status = session.api_key
		? await readWasenderSessionStatus(session.api_key).catch(
				(error: unknown) => {
					if (isMissing(error) && session.status === "disconnected")
						return "disconnected";
					throw error;
				},
			)
		: session.status;
	switch (status) {
		case "connected": {
			if (!session.api_key) return "unavailable";
			const phone = await readWasenderLinkedPhone(session.api_key);
			if (!phone) return "unavailable";
			return phone === row.phone ? "connected" : "wrong_number";
		}
		case "connecting":
		case "need_scan":
			return "pairing";
		case "disconnected":
		case "logged_out":
		case "expired":
		case "need_passkey":
			return "disconnected";
		default:
			return "unavailable";
	}
}

async function readConnection(token: string, row: Connection) {
	if (row.providerSessionId === null) return view(row, "pending");
	const session = await providerSession(token, row);
	return view(
		row,
		session ? await connectionStatus(row, session) : "unavailable",
	);
}

export async function readWasenderConnections(
	owner: Owner,
): Promise<WasenderConnections> {
	const token = getWasenderAccessToken();
	if (!token) return { enabled: false, connections: [] };
	const rows = await prisma.wasenderWhatsAppConnection.findMany({
		where: owner,
		orderBy: { createdAt: "asc" },
	});
	const connections = await Promise.all(
		rows.map((row) =>
			readConnection(token, row).catch(() => view(row, "unavailable")),
		),
	);
	return { enabled: true, connections };
}

export async function readOwnedWasenderConnection(owner: Owner, id: string) {
	const token = getWasenderAccessToken();
	if (!token)
		throw new WasenderConnectionError("WaSenderAPI vēl nav aktivizēts.", 503);
	return readConnection(token, await findOwnedConnection(owner, id));
}

async function recoverSession(token: string, row: Connection) {
	const sessions = (await listWasenderSessions(token)).filter((item) =>
		matchesSession(row, item),
	);
	if (sessions.length > 1)
		throw new WasenderConnectionError(
			"Atrasti vairāki savienojumi šim numuram. Sazinieties ar atbalstu.",
		);
	if (!sessions.length) return null;
	return prisma.wasenderWhatsAppConnection.update({
		where: { id: row.id },
		data: { providerSessionId: sessions[0].id },
	});
}

async function startPairing(token: string, row: Connection) {
	const ready =
		row.providerSessionId !== null ? row : await recoverSession(token, row);
	if (!ready?.providerSessionId) return view(row, "pending");
	const session = await providerSession(token, ready);
	if (!session) return view(ready, "unavailable");
	const current =
		session.status === "disconnected"
			? "disconnected"
			: await connectionStatus(ready, session);
	if (current !== "disconnected" && current !== "unavailable")
		return view(ready, current);
	const status = await connectWasenderSession(token, ready.providerSessionId);
	return status === "need_scan" || status === "connecting"
		? view(ready, "pairing")
		: readConnection(token, ready);
}

async function addConnection(token: string, owner: Owner, phone: string) {
	const id = randomUUID();
	const claim = await prisma.wasenderWhatsAppConnection.createMany({
		data: { ...owner, id, phone },
		skipDuplicates: true,
	});
	if (!claim.count) {
		const existing = await prisma.wasenderWhatsAppConnection.findFirst({
			where: { ...owner, phone },
		});
		if (!existing)
			throw new WasenderConnectionError("Šis numurs jau ir pievienots.");
		return startPairing(token, existing);
	}
	const row = await findOwnedConnection(owner, id);
	let session: Awaited<ReturnType<typeof createWasenderSession>>;
	try {
		session = await createWasenderSession(token, nameFor(row), phone);
	} catch (error) {
		if (
			error instanceof WasenderApiError &&
			[400, 401, 402, 403, 409, 422, 429].includes(error.status)
		) {
			await prisma.wasenderWhatsAppConnection.deleteMany({
				where: { ...owner, id, providerSessionId: null },
			});
			if (error.sessionLimit)
				throw new WasenderConnectionError(
					"Sasniegts WaSenderAPI plāna numuru limits.",
				);
			throw error;
		}
		return view(row, "pending");
	}
	if (!matchesSession(row, session)) return view(row, "pending");
	const ready = await prisma.wasenderWhatsAppConnection.update({
		where: { id },
		data: { providerSessionId: session.id },
	});
	return startPairing(token, ready);
}

export async function updateWasenderConnection(
	owner: Owner,
	action: z.infer<typeof wasenderActionSchema>,
): Promise<WasenderConnection | null> {
	const token = getWasenderAccessToken();
	if (!token)
		throw new WasenderConnectionError("WaSenderAPI vēl nav aktivizēts.", 503);
	if (action.action === "add") return addConnection(token, owner, action.phone);
	const row = await findOwnedConnection(owner, action.id);
	if (action.action === "connect") return startPairing(token, row);
	const ready =
		row.providerSessionId !== null ? row : await recoverSession(token, row);
	const session = ready && (await providerSession(token, ready));
	if (action.action === "disconnect") {
		if (!session) return view(row, "unavailable");
		if ((await connectionStatus(row, session)) !== "disconnected")
			await disconnectWasenderSession(token, session.id);
		return view(row, "disconnected");
	}
	if (!ready && Date.now() - row.createdAt.getTime() < provisionGraceMs)
		throw new WasenderConnectionError(
			"Numurs vēl tiek pievienots. Mēģiniet vēlreiz pēc brīža.",
		);
	if (session)
		await removeWasenderSession(token, session.id).catch((error: unknown) => {
			if (!isMissing(error)) throw error;
		});
	await prisma.wasenderWhatsAppConnection.deleteMany({
		where: {
			...owner,
			id: row.id,
			providerSessionId: ready?.providerSessionId ?? null,
		},
	});
	return null;
}

export async function readOwnedWasenderQr(owner: Owner, id: string) {
	const token = getWasenderAccessToken();
	if (!token) return null;
	const row = await findOwnedConnection(owner, id);
	const session = await providerSession(token, row);
	if (!session) return null;
	const status = await connectionStatus(row, session);
	if (status !== "pairing") return null;
	const value = await readWasenderQr(token, session.id);
	return new Uint8Array(await toBuffer(value, { width: 320, margin: 4 }));
}
