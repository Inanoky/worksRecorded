import { prisma } from "@/lib/utils/db";
import { sealWhapiToken } from "./whapi-groups-api";
import {
	readWhapiProjectGroups,
	updateWhapiProjectGroups,
} from "./whapi-groups-store";

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		whapiUserConnection: { findUnique: jest.fn(), createMany: jest.fn() },
		whapiProjectGroups: { findUnique: jest.fn() },
	},
}));

const access = { organizationId: "limeni", userId: "owner", siteId: "project" };
const channel = { id: "existing-channel", phone: "37120000001" };
const group = { id: "120000000000000001@g.us", name: "Testa brigāde" };
const encryptionKey = Buffer.alloc(32, 1);

let env: jest.Replaced<typeof process.env>;

beforeEach(() => {
	env = jest.replaceProperty(process, "env", {
		WHAPI_LIMENI_ENABLED: "1",
		WHAPI_CHANNEL_ENCRYPTION_KEY: encryptionKey.toString("hex"),
	});
});

afterEach(() => {
	env.restore();
	jest.resetAllMocks();
});

it("uses an existing channel without provisioning or Partner credentials", async () => {
	jest.mocked(prisma.whapiUserConnection.findUnique).mockResolvedValue({
		...channel,
		channelId: "test-channel",
		userId: access.userId,
		organizationId: access.organizationId,
		encryptedToken: sealWhapiToken("channel-token", encryptionKey, channel.id),
		privacyConfigured: true,
		pairingExpiresAt: null,
		createdAt: new Date(),
	});
	jest.mocked(prisma.whapiProjectGroups.findUnique).mockResolvedValue({
		siteId: access.siteId,
		connectionId: channel.id,
		phone: channel.phone,
		groups: [group],
	});
	const realFetch = global.fetch;
	global.fetch = jest.fn(async () => ({
		ok: true,
		json: async () => ({
			status: { text: "AUTH" },
			user: { id: channel.phone },
		}),
	})) as unknown as typeof fetch;
	try {
		await expect(readWhapiProjectGroups(access, false)).resolves.toEqual({
			status: "connected",
			phone: channel.phone,
			groups: [group],
		});
		expect(global.fetch).toHaveBeenCalledWith(
			"https://gate.whapi.cloud/health",
			expect.objectContaining({
				headers: { Authorization: "Bearer channel-token" },
			}),
		);
	} finally {
		global.fetch = realFetch;
	}
});

it("leaves the integration unavailable to unconnected users without Partner access", async () => {
	jest.mocked(prisma.whapiUserConnection.findUnique).mockResolvedValue(null);
	await expect(readWhapiProjectGroups(access, true)).resolves.toMatchObject({
		status: "unavailable",
	});
	await expect(
		updateWhapiProjectGroups(access, { action: "connect" }),
	).rejects.toThrow("Jaunu WhatsApp kanālu izveide vēl nav pieejama.");
	expect(prisma.whapiUserConnection.createMany).not.toHaveBeenCalled();
});
