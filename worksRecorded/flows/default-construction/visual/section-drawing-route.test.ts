import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { GET } from "@/app/api/sites/[siteId]/visual/section-drawing/route";
import { prisma } from "@/lib/utils/db";
import { readSectionDrawing } from "./section-drawing-store";
import { requireVisualAccess } from "./store";

const web = jest.requireActual(
	"next/dist/compiled/@edge-runtime/primitives/fetch",
);
const originalWeb = {
	Request: globalThis.Request,
	Response: globalThis.Response,
};
beforeAll(() =>
	Object.assign(globalThis, { Request: web.Request, Response: web.Response }),
);
afterAll(() => Object.assign(globalThis, originalWeb));
jest.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
	getKindeServerSession: jest.fn(),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: { site: { findFirst: jest.fn() } },
}));
jest.mock("./store", () => ({ requireVisualAccess: jest.fn() }));
jest.mock("./section-drawing-store", () => ({ readSectionDrawing: jest.fn() }));
const user = jest.fn();
const context = { params: Promise.resolve({ siteId: "site" }) };
beforeEach(() => {
	jest.resetAllMocks();
	jest
		.mocked(getKindeServerSession)
		.mockReturnValue({ getUser: user } as never);
	user.mockResolvedValue({ id: "user" });
	jest
		.mocked(requireVisualAccess)
		.mockResolvedValue({ organizationId: "org" } as never);
	jest
		.mocked(prisma.site.findFirst)
		.mockResolvedValue({ name: "Šmerļa iela 3" } as never);
	jest
		.mocked(readSectionDrawing)
		.mockResolvedValue({ bytes: Buffer.from([137, 80, 78, 71]) } as never);
});

it("requires sign-in and authorized project access before reading drawings", async () => {
	user.mockResolvedValue(null);
	expect(
		(await GET(new Request("https://app.test/?section=PA1.6"), context)).status,
	).toBe(401);
	expect(requireVisualAccess).not.toHaveBeenCalled();
	user.mockResolvedValue({ id: "user" });
	jest.mocked(requireVisualAccess).mockRejectedValue(new Error("Forbidden"));
	expect(
		(await GET(new Request("https://app.test/?section=PA1.6"), context)).status,
	).toBe(404);
	expect(readSectionDrawing).not.toHaveBeenCalled();
});

it("returns a private PNG for exactly the requested section of the authorized project", async () => {
	const response = await GET(
		new Request("https://app.test/?section=PA1.6"),
		context,
	);
	expect(response.status).toBe(200);
	expect(response.headers.get("content-type")).toBe("image/png");
	expect(response.headers.get("cache-control")).toBe("private, no-store");
	expect(prisma.site.findFirst).toHaveBeenCalledWith({
		where: { id: "site", organizationId: "org" },
		select: { name: true },
	});
	expect(readSectionDrawing).toHaveBeenCalledWith("Šmerļa iela 3", "PA1.6");
	expect(new Uint8Array(await response.arrayBuffer())).toEqual(
		new Uint8Array([137, 80, 78, 71]),
	);
});
