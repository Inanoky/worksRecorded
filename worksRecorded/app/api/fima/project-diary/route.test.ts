const user = jest.fn();
const scope = jest.fn();
const revision = jest.fn();
const delta = jest.fn();
const bis = jest.fn();
const language = jest.fn();
jest.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
	getKindeServerSession: () => ({ getUser: user }),
}));
jest.mock("@/server/actions/shared-actions", () => ({
	orgCheck: (...args: unknown[]) => scope(...args),
	getOrganizationLanguageByUserId: (...args: unknown[]) => language(...args),
}));
jest.mock("@/lib/bis/dashboard-status", () => ({
	getDashboardBisStatus: (...args: unknown[]) => bis(...args),
}));
jest.mock("@/flows/default-construction/backend/fima-diary-workspace", () => ({
	getFimaDiaryRevision: (...args: unknown[]) => revision(...args),
	loadFimaDiaryDelta: (...args: unknown[]) => delta(...args),
}));

import { GET, POST } from "./route";

const siteId = "d65ac3f1-e84f-4948-8a08-aaecfd19e97b";
const hash = "a".repeat(64);
const request = (body: unknown = {}, etag = "") =>
	({
		url: `http://localhost/api/fima/project-diary?project=${siteId}`,
		headers: { get: () => etag },
		json: async () => body,
	}) as unknown as Request;
const original = globalThis.Response;
beforeAll(() => {
	Object.assign(globalThis, {
		Response: class TestResponse {
			status: number;
			headers: Record<string, string>;
			body: unknown;
			constructor(
				body: unknown,
				init?: { status?: number; headers?: Record<string, string> },
			) {
				this.body = body;
				this.status = init?.status ?? 200;
				this.headers = init?.headers ?? {};
			}
			async json() {
				if (!(this.body instanceof ReadableStream)) return this.body;
				const reader = this.body.getReader();
				const decoder = new TextDecoder();
				let value = "";
				for (;;) {
					const part = await reader.read();
					if (part.done) break;
					value += decoder.decode(part.value, { stream: true });
				}
				return JSON.parse(value + decoder.decode());
			}
			static json(
				body: unknown,
				init?: { status?: number; headers?: Record<string, string> },
			) {
				return new TestResponse(body, init);
			}
		},
	});
});
afterAll(() => {
	globalThis.Response = original;
});
beforeEach(() => {
	jest.clearAllMocks();
	user.mockResolvedValue({ id: "user" });
	scope.mockResolvedValue({ organizationId: "org" });
	revision.mockResolvedValue(hash);
	delta.mockResolvedValue({
		siteId,
		rows: [],
		versions: {},
		removed: [],
		revision: hash,
	});
	bis.mockResolvedValue({ enabled: true });
	language.mockResolvedValue("lv");
});
it("returns 304 without loading record data when the project has not changed", async () => {
	const result = await GET(request({}, `"${hash}"`));
	expect(result.status).toBe(304);
	expect(delta).not.toHaveBeenCalled();
	expect(revision).toHaveBeenCalledWith("org", siteId);
});
it("loads a scoped initial snapshot and checks BIS connectivity only during project preparation", async () => {
	const result = await POST(request({ project: siteId }));
	expect(result.status).toBe(200);
	expect(await result.json()).toMatchObject({
		bisEnabled: true,
		organizationLanguage: "lv",
	});
	expect(delta).toHaveBeenCalledWith("org", siteId, undefined);
	expect(bis).toHaveBeenCalledTimes(1);
});
it("forwards only version identifiers for incremental updates without repeating BIS calls", async () => {
	const known = { configVersion: hash, versions: { [siteId]: hash } };
	await POST(request({ project: siteId, known, organizationId: "attacker" }));
	expect(delta).toHaveBeenCalledWith("org", siteId, known);
	expect(bis).not.toHaveBeenCalled();
	expect(language).not.toHaveBeenCalled();
});
it.each([401, 403])(
	"rejects access with %i before reading data",
	async (status) => {
		if (status === 401) user.mockResolvedValue(null);
		else scope.mockResolvedValue(null);
		expect((await GET(request())).status).toBe(status);
		expect((await POST(request({ project: siteId }))).status).toBe(status);
		expect(delta).not.toHaveBeenCalled();
		expect(revision).not.toHaveBeenCalled();
	},
);
it("rejects malformed manifests", async () => {
	expect(
		(
			await POST(
				request({
					project: siteId,
					known: { configVersion: "bad", versions: {} },
				}),
			)
		).status,
	).toBe(400);
	expect(delta).not.toHaveBeenCalled();
});
