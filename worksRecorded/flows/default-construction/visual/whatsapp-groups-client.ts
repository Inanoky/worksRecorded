export type WhatsAppGroup = { id: string; name: string };

export type WhatsAppGroupConnection = {
	status:
		| "unavailable"
		| "disconnected"
		| "pairing"
		| "connected"
		| "reconnect"
		| "expired";
	phone: string | null;
	connectionId?: string;
	senders?: { id: string; phone: string }[];
	groups: WhatsAppGroup[];
	availableGroups?: WhatsAppGroup[];
};

type GroupAction = {
	action: "save-groups";
	connectionId: string;
	groupIds: string[];
};

export function whatsAppGroupsEndpoint(siteId: string) {
	return `/api/sites/${encodeURIComponent(siteId)}/visual/whatsapp-groups`;
}

export function filterWhatsAppGroups(groups: WhatsAppGroup[], query: string) {
	const normalize = (value: string) =>
		value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("lv");
	const search = normalize(query.trim());
	return groups.filter(({ name }) => normalize(name).includes(search));
}

export async function readWhatsAppGroups(
	siteId: string,
	options: {
		manage?: boolean;
		connectionId?: string;
		revision?: string;
		signal?: AbortSignal;
	} = {},
) {
	const query = new URLSearchParams();
	if (options.manage) query.set("manage", "1");
	if (options.connectionId) query.set("connectionId", options.connectionId);
	if (options.revision) query.set("v", options.revision);
	return requestGroups(
		whatsAppGroupsEndpoint(siteId) + (query.size ? `?${query}` : ""),
		{ signal: options.signal },
	);
}

export function updateWhatsAppGroups(siteId: string, action: GroupAction) {
	return requestGroups(whatsAppGroupsEndpoint(siteId), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(action),
	});
}

async function requestGroups(url: string, options: RequestInit) {
	const response = await fetch(url, { ...options, cache: "no-store" });
	const payload = await response.json().catch(() => null);
	if (!response.ok || !payload)
		throw new Error(
			typeof payload?.error === "string"
				? payload.error
				: "Neizdevās ielādēt WhatsApp grupas. Mēģiniet vēlreiz.",
		);
	return payload as WhatsAppGroupConnection;
}
