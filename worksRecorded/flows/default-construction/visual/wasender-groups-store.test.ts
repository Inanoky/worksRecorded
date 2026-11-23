const findUnique = jest.fn();
const upsert = jest.fn();
const readWasenderConnections = jest.fn();
const requireConnectedWasenderSession = jest.fn();
jest.mock("@/lib/utils/db", () => ({
	prisma: { wasenderProjectGroups: { findUnique, upsert } },
}));
jest.mock("./wasender-connections-store", () => ({
	readWasenderConnections,
	requireConnectedWasenderSession,
	wasenderConnectionId: require("zod").z.string().uuid(),
	WasenderConnectionError: Error,
}));

import {
	readWasenderProjectGroups,
	resolveWasenderTaskRecipient,
	saveWasenderProjectGroups,
} from "./wasender-groups-store";

const access = { organizationId: "limeni", userId: "owner", siteId: "project" };
const sender = {
	id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
	phone: "+37120000001",
	status: "connected",
};
const group = { id: "120000000000000001@g.us", name: "Testa grupa" };
const other = { id: "120000000000000002@g.us", name: "Cita grupa" };
const provider = jest.fn();
const originalFetch = global.fetch;

beforeEach(() => {
	jest.clearAllMocks();
	global.fetch = provider;
	findUnique.mockResolvedValue({ connectionId: sender.id, groups: [group] });
	readWasenderConnections.mockResolvedValue({
		enabled: true,
		connections: [sender],
	});
	requireConnectedWasenderSession.mockResolvedValue({
		connectionId: sender.id,
		phone: sender.phone,
		token: "session-key",
	});
	provider.mockResolvedValue({
		ok: true,
		json: async () => ({
			success: true,
			data: [group, other].map(({ id, name }) => ({ jid: id, name })),
		}),
	});
});

afterEach(() => {
	global.fetch = originalFetch;
});

it("lists groups from the WaSenderAPI phone and exposes only selected groups to task senders", async () => {
	expect(
		(await readWasenderProjectGroups(access, true)).availableGroups,
	).toEqual([other, group]);
	expect(provider).toHaveBeenCalledWith(
		"https://wasenderapi.com/api/groups?paginated=false",
		expect.objectContaining({
			headers: expect.objectContaining({ Authorization: "Bearer session-key" }),
		}),
	);
	expect((await readWasenderProjectGroups(access, false)).groups).toEqual([
		group,
	]);
	expect(
		await resolveWasenderTaskRecipient(access, group.id, sender.phone.slice(1)),
	).toMatchObject({ group, connectionId: sender.id });
	await expect(
		resolveWasenderTaskRecipient(access, other.id, sender.phone.slice(1)),
	).rejects.toThrow("nav iespējota projektam");
});

it("rejects a group that the connected WhatsApp phone cannot see", async () => {
	await expect(
		saveWasenderProjectGroups(access, {
			action: "save-groups",
			connectionId: sender.id,
			groupIds: ["120000000000000099@g.us"],
		}),
	).rejects.toThrow("grupas ir mainījušās");
	expect(upsert).not.toHaveBeenCalled();
});
