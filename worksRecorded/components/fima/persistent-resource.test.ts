import { deserialize, serialize } from "node:v8";
import { IDBFactory } from "fake-indexeddb";
import {
	clearPersistentProjects,
	switchPersistentIdentity,
} from "@/flows/default-construction/visual/project-persistent-cache";
import { fimaResourcePersistence } from "./persistent-resource";

const old = {
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
	Object.assign(global, old);
});
it("persists project data across resource factories and isolates identity, project, case and schema", async () => {
	const cache = fimaResourcePersistence<{ revision: string }>(
		"user:org",
		{ a: "668714", b: "668708" },
		"diary",
	);
	if (!cache) throw new Error("Missing cache");
	await cache("a").write({ revision: "v1" });
	expect(
		await fimaResourcePersistence(
			"user:org",
			{ a: "668714" },
			"diary",
		)?.("a").read(),
	).toEqual({ revision: "v1" });
	for (const [scope, id, caseId, kind] of [
		["other:org", "a", "668714", "diary"],
		["user:other", "a", "668714", "diary"],
		["user:org", "b", "668714", "diary"],
		["user:org", "a", "new-case", "diary"],
		["user:org", "a", "668714", "acts"],
	] as const)
		expect(
			await fimaResourcePersistence(scope, { [id]: caseId }, kind)?.(id).read(),
		).toBeUndefined();
});
it("serializes writes so older snapshots cannot overwrite a new edit or a revoked cache", async () => {
	const factory = fimaResourcePersistence("user:org", { a: "case" }, "diary");
	if (!factory) throw new Error("Missing cache");
	const cache = factory("a");
	await Promise.all([
		cache.write({ revision: "old" }),
		cache.write({ revision: "new" }),
	]);
	expect(await cache.read()).toEqual({ revision: "new" });
	await cache.write(null);
	expect(await cache.read()).toBeUndefined();
});
it("purges cached FIMA data when the signed-in identity changes", async () => {
	await switchPersistentIdentity("user:org");
	const cache = fimaResourcePersistence(
		"user:org",
		{ a: "case" },
		"acts",
	)?.("a");
	await cache?.write({ revision: "old" });
	await switchPersistentIdentity("new:org");
	expect(await cache?.read()).toBeUndefined();
});
