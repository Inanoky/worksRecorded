import type {
	FimaDiaryDelta,
	FimaDiaryWorkspace,
} from "@/lib/fima/diary-workspace";
import { mapCommonDiaryListRecord } from "@/lib/site-diary/list-record";
import { createFimaDiaryResource } from "./diary-resource";

const row = (id: string) =>
	mapCommonDiaryListRecord({
		id,
		Date: "2026-10-20",
		createdAt: "2026-10-20",
		Works: id,
	});
const delta = (
	siteId = "a",
): FimaDiaryDelta &
	Pick<FimaDiaryWorkspace, "bisEnabled" | "organizationLanguage"> => ({
	siteId,
	revision: "v1",
	configVersion: "c1",
	versions: { one: "h1", two: "h2" },
	config: {
		otherSettings: { fimaCollaboration: true },
	} as FimaDiaryWorkspace["config"],
	rows: [row("one"), row("two")],
	removed: [],
	bisEnabled: true,
	organizationLanguage: "lv",
});
const response = (data: unknown, status = 200) =>
	({
		status,
		ok: status >= 200 && status < 300,
		json: async () => data,
	}) as Response;
it("deduplicates initial loads and serves ready project data without another request", async () => {
	const request = jest.fn().mockResolvedValue(response(delta()));
	const view = jest.fn().mockResolvedValue({});
	const resource = createFimaDiaryResource(view, request);
	await Promise.all([resource.load("a"), resource.load("a")]);
	await resource.load("a");
	expect(request).toHaveBeenCalledTimes(1);
	expect(view).toHaveBeenCalledTimes(1);
	expect(resource.get("a").data?.rows[0].Date).toBeInstanceOf(Date);
	expect(resource.get("b").data).toBeNull();
});
it("a 304 background check never downloads rows or replaces cached state", async () => {
	const request = jest
		.fn()
		.mockResolvedValueOnce(response(delta()))
		.mockResolvedValue(response(null, 304));
	const resource = createFimaDiaryResource(async () => {}, request);
	await resource.load("a");
	const before = resource.get("a");
	await resource.load("a", true);
	expect(request).toHaveBeenCalledTimes(2);
	expect(request.mock.calls[1][1].method).toBeUndefined();
	expect(resource.get("a")).toBe(before);
	expect(request.mock.calls[1][1].headers).toEqual({ "If-None-Match": '"v1"' });
});
it("sends known versions, merges only changed rows and removals, preserving local state", async () => {
	const request = jest
		.fn()
		.mockResolvedValueOnce(response(delta()))
		.mockResolvedValueOnce(response({ revision: "v2" }))
		.mockResolvedValueOnce(
			response({
				...delta(),
				revision: "v2",
				config: undefined,
				versions: { one: "h3", three: "h4" },
				rows: [{ ...row("one"), Comments: "Ieva" }, row("three")],
				removed: ["two"],
			}),
		);
	const resource = createFimaDiaryResource(async () => {}, request);
	await resource.load("a");
	await resource.load("a", true);
	expect(JSON.parse(request.mock.calls[2][1].body)).toMatchObject({
		known: { versions: { one: "h1", two: "h2" }, configVersion: "c1" },
	});
	expect(resource.get("a").data?.rows.map((row) => row.id)).toEqual([
		"one",
		"three",
	]);
	expect(resource.get("a").data?.rows[0].Comments).toBe("Ieva");
});
it("does not overwrite a confirmed local edit with an older response already in flight", async () => {
	let resolve!: (value: Response) => void;
	const request = jest
		.fn()
		.mockResolvedValueOnce(response(delta()))
		.mockResolvedValueOnce(response({ revision: "v2" }))
		.mockImplementationOnce(
			() =>
				new Promise((done) => {
					resolve = done;
				}),
		);
	const resource = createFimaDiaryResource(async () => {}, request);
	await resource.load("a");
	const work = resource.load("a", true);
	await Promise.resolve();
	resource.patch("a", [{ id: "one", Works: "Saved later" }]);
	resolve(
		response({
			...delta(),
			revision: "v2",
			rows: [{ ...row("one"), Works: "Older" }],
			versions: { one: "h3" },
		}),
	);
	await work;
	expect(resource.get("a").data?.rows[0].Works).toBe("Saved later");
	expect(resource.get("a").data?.versions.one).toBe("h1");
	expect(resource.get("a").data?.revision).toBe("");
});
it("retains data after a temporary outage but clears it if project access is revoked", async () => {
	const request = jest
		.fn()
		.mockResolvedValueOnce(response(delta()))
		.mockResolvedValueOnce(response(null, 503))
		.mockResolvedValueOnce(response(null, 304))
		.mockResolvedValueOnce(response(null, 403));
	const resource = createFimaDiaryResource(async () => {}, request);
	await resource.load("a");
	const before = resource.get("a").data;
	await resource.load("a", true);
	expect(resource.get("a")).toMatchObject({ status: "error", data: before });
	await resource.load("a", true);
	expect(resource.get("a").status).toBe("ready");
	await resource.load("a", true);
	expect(resource.get("a").data).toBeNull();
});

it("restores saved rows before checking changes and never redownloads an unchanged project", async () => {
	const saved = { ...delta(), config: delta().config };
	const cache = {
		read: jest.fn().mockResolvedValue(saved),
		write: jest.fn().mockResolvedValue(undefined),
	};
	let finish!: (value: Response) => void;
	const request = jest.fn().mockImplementation(
		() =>
			new Promise((done) => {
				finish = done;
			}),
	);
	const resource = createFimaDiaryResource(
		async () => {},
		request,
		() => cache,
	);
	const work = resource.load("a");
	await new Promise((resolve) => setTimeout(resolve, 0));
	expect(resource.get("a")).toMatchObject({
		status: "ready",
		data: { rows: [{ id: "one" }, { id: "two" }] },
	});
	expect(request.mock.calls[0][1].method).toBeUndefined();
	finish(response(null, 304));
	await work;
	expect(request).toHaveBeenCalledTimes(1);
	expect(resource.get("a").data?.rows[0].Date).toBeInstanceOf(Date);
});
it("uses saved versions for the first delta after a browser restart", async () => {
	const saved = { ...delta(), config: delta().config };
	const cache = {
		read: jest.fn().mockResolvedValue(saved),
		write: jest.fn().mockResolvedValue(undefined),
	};
	const request = jest
		.fn()
		.mockResolvedValueOnce(response({ revision: "v2" }))
		.mockResolvedValueOnce(
			response({
				...delta(),
				revision: "v2",
				config: undefined,
				rows: [{ ...row("one"), Works: "Changed only" }],
				removed: ["two"],
				versions: { one: "h3" },
			}),
		);
	const resource = createFimaDiaryResource(
		async () => {},
		request,
		() => cache,
	);
	await resource.load("a");
	expect(JSON.parse(request.mock.calls[1][1].body).known.versions).toEqual(
		saved.versions,
	);
	expect(resource.get("a").data?.rows).toHaveLength(1);
	expect(resource.get("a").data?.rows[0].Works).toBe("Changed only");
	expect(cache.write).toHaveBeenLastCalledWith(
		expect.objectContaining({ revision: "v2" }),
	);
});
it("discards a cache from another project and clears a persisted cache after access denial", async () => {
	const cache = {
		read: jest
			.fn()
			.mockResolvedValue({ ...delta("b"), config: delta().config }),
		write: jest.fn().mockResolvedValue(undefined),
	};
	const request = jest.fn().mockResolvedValue(response(delta()));
	const resource = createFimaDiaryResource(
		async () => {},
		request,
		() => cache,
	);
	await resource.load("a");
	expect(request.mock.calls[0][1].method).toBe("POST");
	request.mockResolvedValue(response(null, 403));
	await resource.load("a", true);
	expect(resource.get("a").data).toBeNull();
	expect(cache.write).toHaveBeenLastCalledWith(null);
});
