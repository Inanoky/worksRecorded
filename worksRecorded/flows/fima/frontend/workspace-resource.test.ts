import { emptyProposal, type FimaRow } from "../lib/records";
import {
	type FimaWorkspaceDelta,
	mergeFimaWorkspace,
} from "../lib/workspace-sync";
import { createFimaWorkspaceResource } from "./workspace-resource";

const scope = JSON.stringify(["user:org", null]);
const row = (id: string, version = 1): FimaRow => ({
	id,
	version,
	localId: id,
	siteId: "site",
	stage: "draft",
	proposal: emptyProposal("2026-11-06"),
	sources: [],
	bisId: null,
	bisCaseId: null,
	bisStatus: null,
	managed: false,
	snapshot: null,
	updatedAt: "2026-11-06",
});
const delta = (records = [row("a"), row("b")]): FimaWorkspaceDelta => ({
	scope,
	records,
	order: records.map((r) => r.id),
	truncated: false,
	bisBase: "https://bis.gov.lv",
	sites: [],
	templates: [],
	operations: [],
	cache: {
		revision: "r1",
		records: Object.fromEntries(records.map((r) => [r.id, String(r.version)])),
		sites: "s",
		templates: "t",
		operations: "o",
	},
});
const snapshot = () => mergeFimaWorkspace(null, delta());

it("shows persisted records before a delayed check finishes, without writing unchanged data", async () => {
	const cached = snapshot();
	const persistence = {
		read: jest.fn(async () => cached),
		write: jest.fn(async () => {}),
	};
	let resolve!: (v: { kind: "unchanged"; scope: string }) => void;
	const load = jest.fn(
		() =>
			new Promise<{ kind: "unchanged"; scope: string }>((r) => {
				resolve = r;
			}),
	);
	const resource = createFimaWorkspaceResource(scope, load, persistence);
	const work = resource.refresh();
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
	expect(resource.get().data).toBe(cached);
	expect(load).toHaveBeenCalledWith(cached.cache);
	expect(resource.refresh()).toBe(work);
	resolve({ kind: "unchanged", scope });
	await work;
	expect(persistence.write).not.toHaveBeenCalled();
});
it("merges a changed record, removes deleted records and retains unchanged objects", () => {
	const cached = snapshot();
	const change = delta([row("b"), row("c")]);
	change.records = [row("c")];
	const next = mergeFimaWorkspace(cached, change);
	expect(next.records.map((r) => r.id)).toEqual(["b", "c"]);
	expect(next.records[0]).toBe(cached.records[1]);
	expect(() =>
		mergeFimaWorkspace(cached, { ...change, scope: "other" }),
	).toThrow("scope");
});
it("keeps cached records on a network failure and clears them after access is revoked", async () => {
	const cached = snapshot();
	const persistence = {
		read: jest.fn(async () => cached),
		write: jest.fn(async () => {}),
	};
	const load = jest
		.fn()
		.mockRejectedValueOnce(new Error("offline"))
		.mockResolvedValueOnce({ kind: "denied" });
	const resource = createFimaWorkspaceResource(scope, load, persistence);
	await expect(resource.refresh()).rejects.toThrow("offline");
	expect(resource.get().data).toBe(cached);
	await resource.refresh();
	expect(resource.get().data).toBeNull();
	expect(persistence.write).toHaveBeenLastCalledWith(null);
});
it("checks again after an in-flight poll when a completed mutation requires a fresh version", async () => {
	let finish!: (v: { kind: "unchanged"; scope: string }) => void;
	const load = jest
		.fn()
		.mockImplementationOnce(
			() =>
				new Promise((r) => {
					finish = r;
				}),
		)
		.mockResolvedValue({ kind: "unchanged", scope });
	const resource = createFimaWorkspaceResource(scope, load, {
		read: async () => snapshot(),
		write: async () => {},
	});
	const poll = resource.refresh();
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
	const mutation = resource.refresh(true);
	finish({ kind: "unchanged", scope });
	await Promise.all([poll, mutation]);
	expect(load).toHaveBeenCalledTimes(2);
});
it("checks just the revision before uploading any row inventory", async () => {
	const cached = snapshot();
	const load = jest.fn();
	const check = jest.fn().mockResolvedValue({ kind: "unchanged", scope });
	const resource = createFimaWorkspaceResource(
		scope,
		load,
		{ read: async () => cached, write: async () => {} },
		check,
	);
	await resource.refresh();
	expect(check).toHaveBeenCalledWith(cached.cache.revision);
	expect(load).not.toHaveBeenCalled();
});
