import { Blob as NodeBlob } from "node:buffer";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { GET } from "@/app/api/public/visual-work/[token]/image/[page]/route";
import { POST } from "@/app/api/sites/[siteId]/visual/planning-share/route";
import { SHARE_MAX_BODY } from "./planning-share-model";
import {
	loadPublicVisualWork,
	publishVisualPlanningShare,
} from "./planning-share-store";

const web = jest.requireActual(
	"next/dist/compiled/@edge-runtime/primitives/fetch",
);
const originalWeb = {
	Request: globalThis.Request,
	Response: globalThis.Response,
	FormData: globalThis.FormData,
};
beforeAll(() =>
	Object.assign(globalThis, {
		Request: web.Request,
		Response: web.Response,
		FormData: web.FormData,
	}),
);
afterAll(() => Object.assign(globalThis, originalWeb));

jest.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
	getKindeServerSession: jest.fn(),
}));
jest.mock("./planning-share-store", () => ({
	loadPublicVisualWork: jest.fn(),
	publishVisualPlanningShare: jest.fn(),
}));
const user = jest.fn();
const context = { params: Promise.resolve({ siteId: "site" }) };
const imageContext = {
	params: Promise.resolve({ token: "secret", page: "1" }),
};
const originalFetch = globalThis.fetch;
beforeEach(() => {
	jest.resetAllMocks();
	jest
		.mocked(getKindeServerSession)
		.mockReturnValue({ getUser: user } as never);
	user.mockResolvedValue({ id: "user" });
	globalThis.fetch = jest.fn();
});
afterEach(() => {
	globalThis.fetch = originalFetch;
	jest.restoreAllMocks();
});
it("requires same-origin authenticated publication before processing uploads", async () => {
	expect(
		(
			await POST(
				new Request("https://worksrecorded.com/api", {
					method: "POST",
					headers: { origin: "https://evil.com" },
				}),
				context,
			)
		).status,
	).toBe(403);
	expect(user).not.toHaveBeenCalled();
	user.mockResolvedValue(null);
	expect(
		(
			await POST(
				new Request("https://worksrecorded.com/api", {
					method: "POST",
					headers: { origin: "https://worksrecorded.com" },
				}),
				context,
			)
		).status,
	).toBe(401);
	expect(publishVisualPlanningShare).not.toHaveBeenCalled();
});
it("rejects oversized requests before decoding or uploading", async () => {
	expect(
		(
			await POST(
				new Request("https://worksrecorded.com/api", {
					method: "POST",
					headers: {
						origin: "https://worksrecorded.com",
						"content-length": String(SHARE_MAX_BODY + 1),
					},
				}),
				context,
			)
		).status,
	).toBe(413);
	expect(publishVisualPlanningShare).not.toHaveBeenCalled();
});
it("publishes authenticated multipart images and returns only a WorksRecorded path and token", async () => {
	const form = new FormData();
	form.set("planId", "plan");
	form.set("version", "2");
	form.set("pages", "[1]");
	form.append(
		"images",
		new NodeBlob([new Uint8Array([255, 216, 255, 217])], {
			type: "image/jpeg",
		}) as unknown as Blob,
		"zone.jpg",
	);
	jest.spyOn(Response.prototype, "formData").mockResolvedValue(form);
	jest
		.mocked(publishVisualPlanningShare)
		.mockResolvedValue({ token: "secret" });
	const response = await POST(
		new Request("https://worksrecorded.com/api", {
			method: "POST",
			headers: { origin: "https://worksrecorded.com" },
			body: form,
		}),
		context,
	);
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({
		token: "secret",
		path: "/shared/work/secret",
	});
	expect(publishVisualPlanningShare).toHaveBeenCalledWith(
		"user",
		"site",
		{ planId: "plan", version: 2, pages: [1] },
		[expect.objectContaining({ type: "image/jpeg" })],
	);
});
it("returns 404 for revoked links without fetching storage or requiring login", async () => {
	jest.mocked(loadPublicVisualWork).mockResolvedValue(null);
	expect(
		(await GET(new Request("https://worksrecorded.com/image"), imageContext))
			.status,
	).toBe(404);
	expect(globalThis.fetch).not.toHaveBeenCalled();
	expect(user).not.toHaveBeenCalled();
});
it("serves only a bounded JPEG, disables caching and rejects storage redirects", async () => {
	jest.mocked(loadPublicVisualWork).mockResolvedValue({
		images: [{ page: 1, url: "https://files.ufs.sh/f/image" }],
	} as never);
	jest
		.mocked(globalThis.fetch)
		.mockResolvedValue(new Response(new Uint8Array([255, 216, 255, 217])));
	const response = await GET(
		new Request("https://worksrecorded.com/image"),
		imageContext,
	);
	expect(response.status).toBe(200);
	expect(response.headers.get("content-type")).toBe("image/jpeg");
	expect(response.headers.get("cache-control")).toBe("private, no-store");
	expect(response.headers.get("referrer-policy")).toBe("no-referrer");
	expect(globalThis.fetch).toHaveBeenCalledWith(
		"https://files.ufs.sh/f/image",
		expect.objectContaining({ redirect: "error", cache: "no-store" }),
	);
	jest.mocked(globalThis.fetch).mockResolvedValue(new Response("not an image"));
	jest.spyOn(console, "error").mockImplementation(() => undefined);
	expect(
		(await GET(new Request("https://worksrecorded.com/image"), imageContext))
			.status,
	).toBe(503);
});
