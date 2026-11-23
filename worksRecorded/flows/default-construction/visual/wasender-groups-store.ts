import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/utils/db";
import {
	listWasenderGroups,
	wasenderGroupId,
	wasenderGroups,
} from "./wasender-connections-api";
import {
	readWasenderConnections,
	requireConnectedWasenderSession,
	WasenderConnectionError,
	wasenderConnectionId,
} from "./wasender-connections-store";
import type { WhatsAppGroupConnection } from "./whatsapp-groups-client";

type Access = { organizationId: string; userId: string; siteId: string };

export const saveWasenderGroupsSchema = z
	.object({
		action: z.literal("save-groups"),
		connectionId: wasenderConnectionId,
		groupIds: z.array(wasenderGroupId).max(500),
	})
	.strict();

function projectSelection({ siteId, userId }: Access) {
	return prisma.wasenderProjectGroups.findUnique({
		where: { siteId_userId: { siteId, userId } },
	});
}

export async function readWasenderProjectGroups(
	access: Access,
	manage: boolean,
	requestedId?: string,
): Promise<WhatsAppGroupConnection> {
	const [settings, state] = await Promise.all([
		projectSelection(access),
		readWasenderConnections(access),
	]);
	const connected = state.connections.filter(
		(item) => item.status === "connected",
	);
	const senders = manage
		? connected.map(({ id, phone }) => ({ id, phone }))
		: undefined;
	const id =
		(manage ? requestedId : undefined) ??
		settings?.connectionId ??
		connected[0]?.id;
	const sender = connected.find(({ id: candidate }) => candidate === id);
	if (!sender)
		return {
			status: !state.enabled
				? "unavailable"
				: id
					? "reconnect"
					: "disconnected",
			phone: null,
			groups: [],
			connectionId: id,
			senders,
		};
	const selected =
		settings?.connectionId === sender.id
			? wasenderGroups.parse(settings.groups)
			: [];
	const connection = {
		status: "connected",
		connectionId: sender.id,
		phone: sender.phone.slice(1),
		groups: selected,
		senders,
	} as const;
	if (!manage) return connection;
	const session = await requireConnectedWasenderSession(access, sender.id);
	const availableGroups = await listWasenderGroups(session.token);
	const selectedIds = new Set(selected.map(({ id }) => id));
	return {
		...connection,
		availableGroups,
		groups: availableGroups.filter(({ id }) => selectedIds.has(id)),
	};
}

export async function saveWasenderProjectGroups(
	access: Access,
	input: z.infer<typeof saveWasenderGroupsSchema>,
) {
	const session = await requireConnectedWasenderSession(
		access,
		input.connectionId,
	);
	const available = await listWasenderGroups(session.token);
	const selected = new Set(input.groupIds);
	const groups = available.filter(({ id }) => selected.has(id));
	if (groups.length !== selected.size)
		throw new WasenderConnectionError(
			"Pieejamās grupas ir mainījušās. Atjaunojiet iestatījumus.",
		);
	const data = { connectionId: session.connectionId, groups };
	await prisma.wasenderProjectGroups.upsert({
		where: { siteId_userId: { siteId: access.siteId, userId: access.userId } },
		create: { siteId: access.siteId, userId: access.userId, ...data },
		update: data,
	});
	return readWasenderProjectGroups(access, true);
}

export async function resolveWasenderTaskRecipient(
	access: Access,
	groupId: string,
	phone: string,
) {
	const settings = await projectSelection(access);
	if (
		!settings ||
		!wasenderGroups.parse(settings.groups).some(({ id }) => id === groupId)
	)
		throw new WasenderConnectionError(
			"Šī WhatsApp grupa nav iespējota projektam.",
		);
	const session = await requireConnectedWasenderSession(
		access,
		settings.connectionId,
	);
	if (session.phone !== `+${phone}`)
		throw new WasenderConnectionError(
			"WhatsApp sūtītājs ir mainījies. Atveriet nosūtīšanas logu no jauna.",
		);
	const group = (await listWasenderGroups(session.token)).find(
		({ id }) => id === groupId,
	);
	if (!group)
		throw new WasenderConnectionError(
			"Grupa vairs nav pieejama saistītajam WhatsApp kontam.",
		);
	return { ...session, phone, group };
}
