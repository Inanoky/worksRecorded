export type WasenderConnectionStatus =
	| "pending"
	| "disconnected"
	| "pairing"
	| "connected"
	| "wrong_number"
	| "unavailable";

export type WasenderConnection = {
	id: string;
	phone: string;
	status: WasenderConnectionStatus;
};

export type WasenderConnections = {
	enabled: boolean;
	connections: WasenderConnection[];
};

export type WasenderConnectionAction =
	| { action: "add"; phone: string }
	| { action: "connect" | "disconnect" | "remove"; id: string };

export function wasenderConnectionsEndpoint(siteId: string) {
	return `/api/sites/${encodeURIComponent(siteId)}/visual/whatsapp-connections`;
}

export async function requestWasenderConnections<T>(
	url: string,
	init: RequestInit,
): Promise<T> {
	const response = await fetch(url, { ...init, cache: "no-store" });
	const data = await response.json().catch(() => null);
	if (!response.ok || !data)
		throw new Error(
			typeof data?.error === "string"
				? data.error
				: "Neizdevās pārbaudīt WhatsApp savienojumu.",
		);
	return data as T;
}
