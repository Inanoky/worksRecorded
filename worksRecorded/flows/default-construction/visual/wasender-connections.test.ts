/** @jest-environment node */
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import type { WasenderWhatsAppConnection } from "@prisma/client";
import {
	GET,
	POST,
} from "@/app/api/sites/[siteId]/visual/whatsapp-connections/route";
import { GET as getGroups } from "@/app/api/sites/[siteId]/visual/whatsapp-groups/route";
import { prisma } from "@/lib/utils/db";
import { requireVisualAccess } from "./store";

jest.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
	getKindeServerSession: jest.fn(),
}));
jest.mock("./store", () => ({ requireVisualAccess: jest.fn() }));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		wasenderWhatsAppConnection: {
			findMany: jest.fn(),
			findFirst: jest.fn(),
			createMany: jest.fn(),
			update: jest.fn(),
			deleteMany: jest.fn(),
		},
		wasenderProjectGroups: { findUnique: jest.fn() },
	},
}));

const owner = { organizationId: "limeni", userId: "user" };
const context = { params: Promise.resolve({ siteId: "site" }) };
const origin = "https://worksrecorded.com";
const endpoint = `${origin}/api/sites/site/visual/whatsapp-connections`;
type Database = Pick<
	typeof prisma.wasenderWhatsAppConnection,
	"createMany" | "findFirst" | "findMany" | "update" | "deleteMany"
>;
const database = prisma.wasenderWhatsAppConnection as unknown as {
	[Method in keyof Database]: jest.Mock<
		Promise<Awaited<ReturnType<Database[Method]>>>,
		Parameters<Database[Method]>
	>;
};
const getUser = jest.fn();
const originalFetch = global.fetch;
const provider = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
const accountKey = "server-account-token";
const sessionKey = "server-session-key";
let row: WasenderWhatsAppConnection | null;
let status: string;
let linkedPhone: string;

function post(action: object, from = origin) {
	return POST(
		new Request(endpoint, {
			method: "POST",
			headers: { origin: from, "content-type": "application/json" },
			body: JSON.stringify(action),
		}),
		context,
	);
}

function get(query = "") {
	return GET(new Request(endpoint + query), context);
}

function ownedRow() {
	if (!row) throw new Error("No stored number");
	return row;
}

function session() {
	const saved = ownedRow();
	return {
		id: 31,
		name: `WorksRecorded Limeni ${saved.id}`,
		phone_number: saved.phone,
		status,
		api_key: sessionKey,
	};
}

beforeEach(() => {
	jest.resetAllMocks();
	jest.replaceProperty(process, "env", {
		...process.env,
		WASENDER_LIMENI_ACCESS_TOKEN: accountKey,
	});
	global.fetch = provider;
	row = null;
	status = "disconnected";
	linkedPhone = "37120000000";
	jest.mocked(getKindeServerSession).mockReturnValue({ getUser } as never);
	getUser.mockResolvedValue({ id: owner.userId });
	jest
		.mocked(requireVisualAccess)
		.mockResolvedValue({ organizationId: owner.organizationId } as never);
	jest.mocked(prisma.wasenderProjectGroups.findUnique).mockResolvedValue(null);
	database.createMany.mockImplementation(async (args) => {
		if (row) return { count: 0 };
		row = {
			...(args?.data as WasenderWhatsAppConnection),
			providerSessionId: null,
			createdAt: new Date(),
		};
		return { count: 1 };
	});
	database.findFirst.mockImplementation(async (args) =>
		args?.where?.organizationId === row?.organizationId &&
		args?.where?.userId === row?.userId
			? row
			: null,
	);
	database.findMany.mockImplementation(async () => (row ? [row] : []));
	database.update.mockImplementation(async ({ data }) => {
		row = {
			...ownedRow(),
			providerSessionId: data.providerSessionId as number,
		};
		return row;
	});
	database.deleteMany.mockImplementation(async () => {
		row = null;
		return { count: 1 };
	});
	provider.mockImplementation(async (input, options) => {
		const url = new URL(String(input));
		expect(url.origin).toBe("https://wasenderapi.com");
		expect(new Headers(options?.headers).get("Authorization")).toBe(
			url.pathname.startsWith("/api/whatsapp-sessions")
				? `Bearer ${accountKey}`
				: `Bearer ${sessionKey}`,
		);
		if (
			url.pathname === "/api/whatsapp-sessions" &&
			options?.method === "POST"
		) {
			expect(JSON.parse(String(options.body))).toEqual({
				name: session().name,
				phone_number: "+37120000000",
				account_protection: true,
				log_messages: false,
				read_incoming_messages: false,
				webhook_enabled: false,
			});
			return Response.json({ success: true, data: session() });
		}
		if (url.pathname === "/api/whatsapp-sessions/31/connect") {
			if (status !== "connected") status = "need_scan";
			return Response.json({
				success: true,
				data: { status: status.toUpperCase(), qrCode: "fixture-qr" },
			});
		}
		if (url.pathname === "/api/whatsapp-sessions/31/qrcode")
			return Response.json({ success: true, data: { qrCode: "fixture-qr" } });
		if (url.pathname === "/api/whatsapp-sessions/31/disconnect") {
			status = "disconnected";
			return Response.json({ success: true, data: { status } });
		}
		if (
			url.pathname === "/api/whatsapp-sessions/31" &&
			options?.method === "DELETE"
		)
			return Response.json({ success: true });
		if (url.pathname === "/api/whatsapp-sessions/31")
			return Response.json({ success: true, data: session() });
		if (url.pathname === "/api/whatsapp-sessions")
			return Response.json({ success: true, data: [session()] });
		if (url.pathname === "/api/status") return Response.json({ status });
		if (url.pathname === "/api/user")
			return Response.json({
				success: true,
				data: { id: `${linkedPhone}:4@s.whatsapp.net` },
			});
		if (url.pathname === "/api/groups")
			return Response.json({
				success: true,
				data: [{ jid: "120000000000000001@g.us", name: "Testa grupa" }],
			});
		throw new Error(`Unexpected test path ${url.pathname}`);
	});
});

it("loads project groups with the organization and user's connected phone", async () => {
	const id = "00000000-0000-4000-8000-000000000001";
	row = {
		id,
		phone: `+${linkedPhone}`,
		...owner,
		providerSessionId: 31,
		createdAt: new Date(),
	};
	status = "connected";
	const response = await getGroups(
		new Request(`${origin}/api/sites/site/visual/whatsapp-groups?manage=1`),
		context,
	);
	expect(response.status).toBe(200);
	expect(await response.json()).toMatchObject({
		status: "connected",
		availableGroups: [{ id: "120000000000000001@g.us", name: "Testa grupa" }],
	});
	expect(database.findMany).toHaveBeenCalledWith({
		where: owner,
		orderBy: { createdAt: "asc" },
	});
	expect(database.findFirst).toHaveBeenCalledWith({ where: { ...owner, id } });
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.restoreAllMocks();
});

it("adds once, generates a private QR, verifies the scanned number, and can disconnect and remove it", async () => {
	expect(await (await get()).json()).toEqual({
		enabled: true,
		connections: [],
	});
	const action = { action: "add", phone: "+371 (20) 000 000" };
	const added = await post(action);
	expect(added.status).toBe(200);
	const id = ownedRow().id;
	expect(await added.json()).toEqual({
		connection: { id, phone: "+37120000000", status: "pairing" },
	});
	expect((await post(action)).status).toBe(200);
	expect(
		provider.mock.calls.filter(
			([url, options]) =>
				String(url).endsWith("/whatsapp-sessions") &&
				options?.method === "POST",
		),
	).toHaveLength(1);
	const image = await get(`?qr=${id}`);
	expect(image.headers.get("Content-Type")).toBe("image/png");
	expect(image.headers.get("Cache-Control")).toBe("private, no-store");
	expect(
		Buffer.from(await image.arrayBuffer())
			.subarray(0, 8)
			.toString("hex"),
	).toBe("89504e470d0a1a0a");
	status = "connected";
	linkedPhone = "37120000001";
	expect(await (await get(`?id=${id}`)).json()).toMatchObject({
		status: "wrong_number",
	});
	expect((await get(`?qr=${id}`)).status).toBe(404);
	linkedPhone = "37120000000";
	expect(await (await get(`?id=${id}`)).json()).toMatchObject({
		status: "connected",
	});
	expect(await (await post({ action: "disconnect", id })).json()).toMatchObject(
		{ connection: { status: "disconnected" } },
	);
	expect(await (await post({ action: "remove", id })).json()).toEqual({
		connection: null,
	});
	expect(await (await get()).json()).toEqual({
		enabled: true,
		connections: [],
	});
});

it("rejects unauthorized projects, non-owners, cross-site actions and malformed numbers", async () => {
	const id = "00000000-0000-4000-8000-000000000001";
	row = {
		id,
		phone: "+37120000000",
		...owner,
		userId: "another-user",
		providerSessionId: 31,
		createdAt: new Date(),
	};
	expect((await get(`?qr=${id}`)).status).toBe(404);
	expect((await post({ action: "disconnect", id })).status).toBe(404);
	expect((await post({ action: "add", phone: "20000000" })).status).toBe(400);
	expect(
		(
			await post(
				{ action: "add", phone: "+37120000000" },
				"https://other.example",
			)
		).status,
	).toBe(403);
	jest
		.mocked(requireVisualAccess)
		.mockRejectedValueOnce(new Error("Access denied"));
	expect((await get()).status).toBe(403);
	getUser.mockResolvedValueOnce(null);
	expect((await get()).status).toBe(401);
	expect(provider).not.toHaveBeenCalled();
});

it("recovers a remote creation after a lost response without allocating a second session", async () => {
	provider.mockRejectedValueOnce(new Error("Network interrupted"));
	const added = await post({ action: "add", phone: "+37120000000" });
	const id = ownedRow().id;
	expect(await added.json()).toMatchObject({
		connection: { id, status: "pending" },
	});
	expect(await (await post({ action: "connect", id })).json()).toMatchObject({
		connection: { status: "pairing" },
	});
	expect(ownedRow().providerSessionId).toBe(31);
	expect(
		provider.mock.calls.filter(([, options]) => options?.method === "POST"),
	).toHaveLength(2);
});
