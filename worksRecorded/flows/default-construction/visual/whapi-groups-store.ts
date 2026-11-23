import { randomUUID } from "node:crypto";
import type { WhapiUserConnection } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/utils/db";
import {
	configureWhapiChannel,
	createWhapiChannel,
	getWhapiConfig,
	listWhapiGroups,
	logoutWhapi,
	openWhapiToken,
	sealWhapiToken,
	WhapiRequestError,
	whapiGroup,
	whapiGroupIdSchema,
	whapiHealth,
	whapiLoginImage,
} from "./whapi-groups-api";
import type { WhatsAppGroupConnection } from "./whatsapp-groups-client";

type Access = { organizationId: string; userId: string; siteId: string };
type Config = NonNullable<ReturnType<typeof getWhapiConfig>>;
const pairingLifetime = 10 * 60 * 1000;
const storedGroups = z.array(
	z.object({ id: whapiGroupIdSchema, name: z.string() }),
);

export const whapiGroupActionSchema = z.discriminatedUnion("action", [
	z.object({ action: z.literal("connect") }).strict(),
	z.object({ action: z.literal("disconnect") }).strict(),
	z
		.object({
			action: z.literal("save-groups"),
			groupIds: z.array(whapiGroupIdSchema).max(500),
		})
		.strict(),
]);

export class WhapiGroupsError extends Error {}

function findConnection({ organizationId, userId }: Access) {
	return prisma.whapiUserConnection.findUnique({
		where: { organizationId_userId: { organizationId, userId } },
	});
}

function pairingOpen(connection: WhapiUserConnection) {
	return (connection.pairingExpiresAt?.getTime() ?? 0) > Date.now();
}

function idleStatus(
	status: WhatsAppGroupConnection["status"],
): WhatsAppGroupConnection {
	return { status, phone: null, groups: [] };
}

function connectionToken(connection: WhapiUserConnection, config: Config) {
	return connection.encryptedToken
		? openWhapiToken(
				connection.encryptedToken,
				config.encryptionKey,
				connection.id,
			)
		: null;
}

async function enabledGroups(
	access: Access,
	connectionId: string,
	phone: string,
) {
	const row = await prisma.whapiProjectGroups.findUnique({
		where: { siteId_connectionId: { siteId: access.siteId, connectionId } },
	});
	return row?.phone === phone ? storedGroups.parse(row.groups) : [];
}

export async function readWhapiProjectGroups(
	access: Access,
	manage: boolean,
): Promise<WhatsAppGroupConnection> {
	const config = getWhapiConfig();
	if (!config) return idleStatus("unavailable");
	const connection = await findConnection(access);
	if (!connection) return idleStatus("disconnected");
	const token = connectionToken(connection, config);
	if (!token || !connection.privacyConfigured)
		return idleStatus(pairingOpen(connection) ? "pairing" : "reconnect");
	let health: Awaited<ReturnType<typeof whapiHealth>>;
	try {
		health = await whapiHealth(token);
	} catch (error) {
		if (error instanceof WhapiRequestError && error.status === 402)
			return idleStatus("expired");
		if (error instanceof WhapiRequestError && error.status === 401)
			return idleStatus(pairingOpen(connection) ? "pairing" : "reconnect");
		throw error;
	}
	if (health.status === "STOP") return idleStatus("expired");
	if (health.status !== "AUTH" || !health.phone)
		return idleStatus(
			pairingOpen(connection)
				? "pairing"
				: connection.phone
					? "reconnect"
					: "disconnected",
		);
	if (connection.phone !== health.phone || connection.pairingExpiresAt)
		await prisma.whapiUserConnection.updateMany({
			where: { id: connection.id, encryptedToken: connection.encryptedToken },
			data: { phone: health.phone, pairingExpiresAt: null },
		});
	const selected = await enabledGroups(access, connection.id, health.phone);
	if (!manage)
		return { status: "connected", phone: health.phone, groups: selected };
	const availableGroups = await listWhapiGroups(token);
	const selectedIds = new Set(selected.map((group) => group.id));
	return {
		status: "connected",
		phone: health.phone,
		availableGroups,
		groups: availableGroups.filter((group) => selectedIds.has(group.id)),
	};
}

async function startPairing(access: Access, config: Config) {
	const existing = await findConnection(access);
	const pairingExpiresAt = new Date(Date.now() + pairingLifetime);
	if (existing) {
		if (!existing.channelId && !pairingOpen(existing))
			throw new WhapiGroupsError(
				"Kanāla izveidi nevarēja apstiprināt. Sazinieties ar WorksRecorded atbalstu.",
			);
		if (existing.channelId)
			await prisma.whapiUserConnection.update({
				where: { id: existing.id },
				data: { pairingExpiresAt },
			});
		return readWhapiProjectGroups(access, true);
	}
	const id = randomUUID();
	const claim = await prisma.whapiUserConnection.createMany({
		data: {
			id,
			userId: access.userId,
			organizationId: access.organizationId,
			pairingExpiresAt,
		},
		skipDuplicates: true,
	});
	if (!claim.count) return readWhapiProjectGroups(access, true);
	try {
		const channel = await createWhapiChannel(
			config,
			`WorksRecorded Līmeni ${id.slice(0, 8)}`,
		);
		await prisma.whapiUserConnection.update({
			where: { id },
			data: {
				channelId: channel.id,
				encryptedToken: sealWhapiToken(channel.token, config.encryptionKey, id),
			},
		});
	} catch (error) {
		if (
			error instanceof WhapiRequestError &&
			error.status >= 400 &&
			error.status < 500
		)
			await prisma.whapiUserConnection.deleteMany({
				where: { id, channelId: null },
			});
		throw error;
	}
	return idleStatus("pairing");
}

export async function readWhapiQrImage(access: Access) {
	const config = getWhapiConfig();
	if (!config) return null;
	const connection = await findConnection(access);
	if (!connection || !pairingOpen(connection)) return null;
	const token = connectionToken(connection, config);
	if (!token) return null;
	if (!connection.privacyConfigured) {
		await configureWhapiChannel(token);
		await prisma.whapiUserConnection.update({
			where: { id: connection.id },
			data: { privacyConfigured: true },
		});
	}
	return whapiLoginImage(token);
}

export async function updateWhapiProjectGroups(
	access: Access,
	action: z.infer<typeof whapiGroupActionSchema>,
) {
	const config = getWhapiConfig();
	if (!config)
		throw new WhapiGroupsError(
			"WhatsApp grupu integrācija vēl nav aktivizēta.",
		);
	if (action.action === "connect") return startPairing(access, config);
	const connection = await findConnection(access);
	const token = connection && connectionToken(connection, config);
	if (!connection || !token)
		throw new WhapiGroupsError("WhatsApp savienojums vēl nav gatavs.");
	if (action.action === "disconnect") {
		await logoutWhapi(token);
		await prisma.$transaction([
			prisma.whapiProjectGroups.deleteMany({
				where: { connectionId: connection.id },
			}),
			prisma.whapiUserConnection.update({
				where: { id: connection.id },
				data: { phone: null, pairingExpiresAt: null },
			}),
		]);
		return idleStatus("disconnected");
	}
	const health = await whapiHealth(token);
	if (health.status !== "AUTH" || !health.phone)
		throw new WhapiGroupsError("Atkārtoti savienojiet WhatsApp kontu.");
	const availableGroups = await listWhapiGroups(token);
	const selectedIds = new Set(action.groupIds);
	const groups = availableGroups.filter(({ id }) => selectedIds.has(id));
	if (groups.length !== selectedIds.size)
		throw new WhapiGroupsError(
			"Pieejamās grupas ir mainījušās. Atjaunojiet iestatījumus.",
		);
	await prisma.whapiProjectGroups.upsert({
		where: {
			siteId_connectionId: {
				siteId: access.siteId,
				connectionId: connection.id,
			},
		},
		create: {
			siteId: access.siteId,
			connectionId: connection.id,
			phone: health.phone,
			groups,
		},
		update: { phone: health.phone, groups },
	});
	return {
		status: "connected",
		phone: health.phone,
		availableGroups,
		groups,
	} satisfies WhatsAppGroupConnection;
}

export async function resolveWhapiTaskRecipient(
	access: Access,
	groupId: string,
	expectedPhone: string,
) {
	const config = getWhapiConfig();
	const connection = config && (await findConnection(access));
	const token = connection && config && connectionToken(connection, config);
	if (!connection || !token || !connection.privacyConfigured)
		throw new WhapiGroupsError(
			"Savienojiet WhatsApp kontu projekta iestatījumos.",
		);
	const health = await whapiHealth(token);
	if (health.status !== "AUTH" || health.phone !== expectedPhone)
		throw new WhapiGroupsError(
			"WhatsApp sūtītājs vairs nav pieejams. Atveriet nosūtīšanas logu no jauna.",
		);
	const groups = await enabledGroups(access, connection.id, expectedPhone);
	if (!groups.some(({ id }) => id === groupId))
		throw new WhapiGroupsError("Šī WhatsApp grupa nav iespējota projektam.");
	try {
		const group = await whapiGroup(token, groupId);
		return { token, group, phone: expectedPhone };
	} catch (error) {
		if (error instanceof WhapiRequestError && [403, 404].includes(error.status))
			throw new WhapiGroupsError(
				"Grupa vairs nav pieejama saistītajam WhatsApp kontam.",
			);
		throw error;
	}
}
