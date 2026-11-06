import { deserialize, serialize } from "node:v8";
import { IDBFactory } from "fake-indexeddb";
import { ZtcPersistentCache } from "./ztc-persistent-cache";
import type { ZtcWorkspaceData } from "./ztc-workspace-data";

const original = {
	indexedDB: global.indexedDB,
	structuredClone: global.structuredClone,
};
const data: ZtcWorkspaceData = {
	siteId: "site-a",
	config: { otherSettings: { hideCreatedAtInSiteList: true } },
	rates: [],
	projectOptions: ["Projekts A"],
	mediaOnlyDays: [],
	rows: [
		{ id: "row", Date: new Date("2026-11-06T10:00:00Z"), Works: "Latojums" },
	],
};
beforeEach(() => {
	global.indexedDB = new IDBFactory();
	global.structuredClone = (value) => deserialize(serialize(value));
});
afterEach(() => {
	jest.restoreAllMocks();
});
afterAll(() => {
	Object.assign(global, original);
});

it("restores all data across instances and preserves dates", async () => {
	await new ZtcPersistentCache("user:org", "site-a").write(data);
	const restored = await new ZtcPersistentCache("user:org", "site-a").read();
	expect(restored).toEqual(data);
	expect(Object.prototype.toString.call(restored?.rows[0].Date)).toBe(
		"[object Date]",
	);
});

it("persists incremental sync metadata alongside rows so a new login only needs a change check", async () => {
	const synced: ZtcWorkspaceData = {
		...data,
		sync: {
			version: 1,
			siteId: "site-a",
			revisions: { rows: "rows", config: "config", media: "media" },
			rows: { row: "revision" },
			media: {},
		},
	};
	await new ZtcPersistentCache("user:org", "site-a").write(synced);
	const restored = await new ZtcPersistentCache("user:org", "site-a").read();
	expect(restored?.sync).toEqual(synced.sync);
	expect(restored?.rows).toEqual(synced.rows);
});

it("isolates users, organizations and sites and never stores anonymous data", async () => {
	await new ZtcPersistentCache("user:org", "site-a").write(data);
	for (const [scope, site] of [
		["other:org", "site-a"],
		["user:other", "site-a"],
		["user:org", "site-b"],
		[undefined, "site-a"],
	]) {
		expect(
			await new ZtcPersistentCache(scope, site ?? "site-a").read(),
		).toBeUndefined();
	}
	const anonymous = new ZtcPersistentCache(undefined, "site-a");
	await anonymous.write(data);
	expect(await anonymous.read()).toBeUndefined();
});

it("survives logout of the shared project cache and clears only the requested site", async () => {
	await new ZtcPersistentCache("user:org", "site-a").write(data);
	const { clearPersistentProjects } = await import(
		"@/flows/default-construction/visual/project-persistent-cache"
	);
	await clearPersistentProjects();
	expect(await new ZtcPersistentCache("user:org", "site-a").read()).toEqual(
		data,
	);
	await new ZtcPersistentCache("other:org", "site-a").write(data);
	await new ZtcPersistentCache("user:org", "site-a").clear();
	expect(
		await new ZtcPersistentCache("user:org", "site-a").read(),
	).toBeUndefined();
	expect(await new ZtcPersistentCache("other:org", "site-a").read()).toEqual(
		data,
	);
});

it("falls back cleanly when storage is unavailable or denied", async () => {
	global.indexedDB = undefined as unknown as IDBFactory;
	const cache = new ZtcPersistentCache("user:org", "site-a");
	expect(await cache.read()).toBeUndefined();
	await expect(cache.write(data)).resolves.toBeUndefined();
	global.indexedDB = new IDBFactory();
	jest.spyOn(indexedDB, "open").mockImplementation(() => {
		throw new DOMException("Denied", "SecurityError");
	});
	expect(await cache.read()).toBeUndefined();
	await expect(cache.clear()).resolves.toBeUndefined();
});

it("rejects incompatible stored versions", async () => {
	await new ZtcPersistentCache("user:org", "site-a").write(data);
	const db = await new Promise<IDBDatabase>((resolve) => {
		const request = indexedDB.open("works-recorded-ztc-v1", 1);
		request.onsuccess = () => resolve(request.result);
	});
	await new Promise<void>((resolve) => {
		const tx = db.transaction("workspaces", "readwrite");
		tx.objectStore("workspaces").put({
			key: JSON.stringify(["user:org", "site-a"]),
			version: 0,
			data,
		});
		tx.oncomplete = () => {
			db.close();
			resolve();
		};
	});
	expect(
		await new ZtcPersistentCache("user:org", "site-a").read(),
	).toBeUndefined();
});
