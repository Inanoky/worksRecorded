import { deserialize, serialize } from "node:v8";
import { IDBFactory } from "fake-indexeddb";
import {
	clearPersistentProjects,
	PersistentProjectCache,
	switchPersistentIdentity,
} from "./project-persistent-cache";

const original = {
	indexedDB: global.indexedDB,
	structuredClone: global.structuredClone,
};
beforeEach(() => {
	global.indexedDB = new IDBFactory();
	global.structuredClone = (value) => deserialize(serialize(value));
	localStorage.clear();
});
afterEach(async () => {
	await clearPersistentProjects();
	jest.restoreAllMocks();
});
afterAll(() => {
	Object.assign(global, original);
});

it("persists across instances and isolates users, organizations and projects", async () => {
	await new PersistentProjectCache("user:org", "site").write("snapshot", {
		version: "v1",
	});
	expect(
		await new PersistentProjectCache("user:org", "site").read("snapshot"),
	).toEqual({ version: "v1" });
	for (const [scope, site] of [
		["another:org", "site"],
		["user:another", "site"],
		["user:org", "another"],
	])
		expect(
			await new PersistentProjectCache(scope, site).read("snapshot"),
		).toBeUndefined();
});

it("expires saved data and bounds storage by discarding old entries", async () => {
	let now = 1_000_000;
	jest.spyOn(Date, "now").mockImplementation(() => now);
	const cache = new PersistentProjectCache("user:org", "site");
	await cache.write("expired", { data: 1 }, 1);
	now += 86_400_001;
	expect(await cache.read("expired")).toBeUndefined();
	const large = "x".repeat(12 * 1024 * 1024);
	await cache.write("oldest", large);
	now++;
	await cache.write("middle", large);
	now++;
	await cache.write("newest", large);
	expect(await cache.read("oldest")).toBeUndefined();
	expect(await cache.read("middle")).toBe(large);
	expect(await cache.read("newest")).toBe(large);
});

it("purges stored projects on logout and an account change", async () => {
	const cache = new PersistentProjectCache("user:org", "site");
	await switchPersistentIdentity("user:org");
	await cache.write("snapshot", { version: "v1" });
	await switchPersistentIdentity("other:org");
	expect(await cache.read("snapshot")).toBeUndefined();
	await cache.write("snapshot", { version: "v2" });
	await clearPersistentProjects();
	expect(await cache.read("snapshot")).toBeUndefined();
});

it("falls back to network loading when browser storage is unavailable or denied", async () => {
	global.indexedDB = undefined as unknown as IDBFactory;
	const cache = new PersistentProjectCache("user:org", "site");
	expect(await cache.read("snapshot")).toBeUndefined();
	await expect(cache.write("snapshot", {})).resolves.toBeUndefined();
	global.indexedDB = new IDBFactory();
	jest.spyOn(indexedDB, "open").mockImplementation(() => {
		throw new DOMException("Denied", "SecurityError");
	});
	expect(await cache.read("snapshot")).toBeUndefined();
});
