import { deserialize, serialize } from "node:v8";
import { IDBFactory } from "fake-indexeddb";
import {
	clearPersistentProjects,
	PersistentProjectCache,
	requestPersistentProjectStorage,
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
	const large = "x".repeat(40 * 1024 * 1024);
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

it("keeps the project and downloaded images across months without age-based expiry", async () => {
	let now = 1000000;
	jest.spyOn(Date, "now").mockImplementation(() => now);
	const cache = new PersistentProjectCache("user:org", "site");
	await cache.write("snapshot", { version: "unchanged" });
	await cache.write("tile:floor:1", { image: "saved" });
	now += 90 * 86400000;
	const reopened = new PersistentProjectCache("user:org", "site");
	expect(await reopened.read("snapshot")).toEqual({ version: "unchanged" });
	expect(await reopened.read("tile:floor:1")).toEqual({ image: "saved" });
});

it("upgrades an existing downloaded project without discarding it when the old expiry passes", async () => {
	await new Promise<void>((resolve, reject) => {
		const request = indexedDB.open("works-recorded-limeni-v1", 1);
		request.onupgradeneeded = () =>
			request.result.createObjectStore("project-cache", { keyPath: "key" });
		request.onerror = () => reject(request.error);
		request.onsuccess = () => {
			const tx = request.result.transaction("project-cache", "readwrite");
			tx.objectStore("project-cache").put({
				key: JSON.stringify(["user:org", "site", "snapshot"]),
				value: { version: "downloaded-before-upgrade" },
				bytes: 100,
				saved: 1,
				expires: 2,
			});
			tx.oncomplete = () => {
				request.result.close();
				resolve();
			};
		};
	});
	expect(
		await new PersistentProjectCache("user:org", "site").read("snapshot"),
	).toEqual({ version: "downloaded-before-upgrade" });
});

it("keeps project snapshots when downloaded tiles fill the storage budget", async () => {
	let now = 1_000_000;
	jest.spyOn(Date, "now").mockImplementation(() => now++);
	const cache = new PersistentProjectCache("user:org", "site");
	await cache.write("snapshot", { version: "project-ready" });
	const large = "x".repeat(40 * 1024 * 1024);
	await cache.write("tile:old", large);
	await cache.write("tile:middle", large);
	await cache.write("tile:new", large);
	expect(await cache.read("snapshot")).toEqual({ version: "project-ready" });
	expect(await cache.read("tile:old")).toBeUndefined();
	expect(await cache.read("tile:new")).toBe(large);
});

it("requests durable browser storage once without blocking cache operations", async () => {
	const persisted = jest.fn().mockResolvedValue(false);
	let finish!: (value: boolean) => void;
	const persist = jest.fn().mockImplementation(
		() =>
			new Promise<boolean>((resolve) => {
				finish = resolve;
			}),
	);
	Object.defineProperty(navigator, "storage", {
		configurable: true,
		value: { persisted, persist },
	});
	try {
		const cache = new PersistentProjectCache("user:org", "site");
		await cache.write("snapshot", { version: "ready" });
		expect(await cache.read("snapshot")).toEqual({ version: "ready" });
		finish(true);
		expect(await requestPersistentProjectStorage()).toBe(true);
		expect(await requestPersistentProjectStorage()).toBe(true);
		expect(persisted).toHaveBeenCalledTimes(1);
		expect(persist).toHaveBeenCalledTimes(1);
	} finally {
		Reflect.deleteProperty(navigator, "storage");
	}
});
