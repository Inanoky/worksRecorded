import type {
	ZtcWorkspaceActivity,
	ZtcWorkspaceData,
	ZtcWorkspaceDelta,
	ZtcWorkspaceResult,
} from "./ztc-workspace-data";
import { ZtcWorkspaceResource } from "./ztc-workspace-resource";

function deferred<T>() {
	let resolve: (value: T) => void = () => {};
	let reject: (error: Error) => void = () => {};
	const promise = new Promise<T>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}

const cached: ZtcWorkspaceData = {
	siteId: "site-a",
	config: {},
	projectOptions: ["Projekts A"],
	rates: [],
	mediaOnlyDays: [],
	rows: [
		{
			id: "row",
			Date: "2026-11-06",
			Works: "Latojums",
			Location_Custom_2: "2",
		},
	],
};
const fresh = {
	...cached,
	rows: [{ ...cached.rows[0], Location_Custom_2: "3" }],
};
const flush = async () => {
	for (let i = 0; i < 8; i++) await Promise.resolve();
};

function setup() {
	const storage = {
		read: jest.fn().mockResolvedValue(cached),
		write: jest.fn().mockResolvedValue(undefined),
		clear: jest.fn().mockResolvedValue(undefined),
	};
	const response = deferred<ZtcWorkspaceResult>();
	const load = jest.fn(() => response.promise);
	const media = jest.fn().mockResolvedValue([]);
	return {
		storage,
		response,
		load,
		media,
		resource: new ZtcWorkspaceResource("site-a", storage, load, media),
	};
}

it("shows persisted data before the background request completes and deduplicates requests", async () => {
	const { resource, load, response, storage } = setup();
	const hydration = resource.hydrate();
	const request = resource.refresh();
	expect(resource.refresh()).toBe(request);
	await hydration;
	expect(resource.getSnapshot()).toMatchObject({
		data: cached,
		refreshing: true,
		hydrating: false,
	});
	expect(load).toHaveBeenCalledTimes(1);
	response.resolve({ status: "ok", data: fresh });
	await request;
	await flush();
	expect(resource.getSnapshot()).toMatchObject({
		data: fresh,
		refreshing: false,
		error: null,
	});
	expect(storage.write).toHaveBeenLastCalledWith(fresh);
});

it("never replaces fresh server data with a late disk read", async () => {
	const { resource, storage, response } = setup();
	const disk = deferred<ZtcWorkspaceData>();
	storage.read.mockReturnValue(disk.promise);
	const hydration = resource.hydrate();
	const request = resource.refresh();
	response.resolve({ status: "ok", data: fresh });
	await request;
	disk.resolve(cached);
	await hydration;
	expect(resource.getSnapshot().data).toEqual(fresh);
});

it("keeps cached rows on transient failures and can recover", async () => {
	const { resource, response, load, storage } = setup();
	await resource.hydrate();
	const request = resource.refresh();
	response.reject(new Error("Offline"));
	await expect(request).rejects.toThrow("Offline");
	expect(resource.getSnapshot()).toMatchObject({
		data: cached,
		error: "Offline",
		refreshing: false,
	});
	expect(storage.clear).not.toHaveBeenCalled();
	load.mockResolvedValue({ status: "ok", data: fresh });
	await resource.refresh();
	expect(resource.getSnapshot()).toMatchObject({ data: fresh, error: null });
});

it("removes a revoked site's persisted data and ignores late hydration", async () => {
	const { resource, storage, response } = setup();
	const disk = deferred<ZtcWorkspaceData>();
	storage.read.mockReturnValue(disk.promise);
	const hydration = resource.hydrate();
	const request = resource.refresh();
	response.resolve({ status: "denied" });
	await expect(request).rejects.toThrow("nav piekļuves");
	disk.resolve(cached);
	await hydration;
	await flush();
	expect(resource.getSnapshot()).toMatchObject({
		data: null,
		denied: true,
		refreshing: false,
	});
	expect(storage.clear).toHaveBeenCalled();
});

it("persists saved payroll changes and discards an older in-flight response", async () => {
	const { resource, response, storage } = setup();
	await resource.hydrate();
	const request = resource.refresh();
	resource.updatePayroll("row", {
		Location_Custom_2: "4",
		Works_Custom_2: "0.9",
		WorkersInvolved: "1.2",
	});
	response.resolve({ status: "ok", data: fresh });
	await request;
	await flush();
	expect(resource.getSnapshot().data?.rows[0]).toMatchObject({
		Location_Custom_2: "4",
		Works_Custom_2: "0.9",
		WorkersInvolved: "1.2",
	});
	expect(storage.write).toHaveBeenLastCalledWith(resource.getSnapshot().data);
});

it("invalidates disk and starts a fresh request after a record edit", async () => {
	const { resource, load, response, storage } = setup();
	await resource.hydrate();
	const old = resource.refresh();
	resource.invalidate();
	load.mockResolvedValue({ status: "ok", data: fresh });
	const update = resource.refresh();
	await update;
	response.resolve({ status: "ok", data: cached });
	await old;
	await flush();
	expect(resource.getSnapshot().data).toEqual(fresh);
	expect(storage.clear).toHaveBeenCalledTimes(1);
});

it("updates saved rates without accepting an older background result", async () => {
	const { resource, response, storage } = setup();
	await resource.hydrate();
	const request = resource.refresh();
	const rates = [
		{
			projectName: "Projekts A",
			works: [],
			additionalDetails: [],
			additionalWorks: [],
		},
	];
	resource.updateRates(rates);
	response.resolve({ status: "ok", data: fresh });
	await request;
	await flush();
	expect(resource.getSnapshot().data?.rates).toEqual(rates);
	expect(storage.write).toHaveBeenLastCalledWith(resource.getSnapshot().data);
});

it("ignores requests and queued writes from an unmounted screen", async () => {
	const { resource, response, storage } = setup();
	await resource.hydrate();
	const request = resource.refresh();
	resource.release();
	response.resolve({ status: "ok", data: fresh });
	await request;
	await flush();
	expect(resource.getSnapshot().data).toEqual(cached);
	expect(storage.write).not.toHaveBeenCalled();
});

function syncSetup() {
	const revisions = { rows: "1", config: "1", media: "1" };
	const data: ZtcWorkspaceData = {
		...cached,
		sync: {
			version: 1,
			siteId: "site-a",
			revisions,
			rows: { row: "1" },
			media: {},
		},
	};
	const storage = {
		read: jest.fn().mockResolvedValue(data),
		write: jest.fn().mockResolvedValue(undefined),
		clear: jest.fn().mockResolvedValue(undefined),
	};
	const check = jest.fn<Promise<ZtcWorkspaceActivity>, []>().mockResolvedValue({
		status: "ok",
		siteId: "site-a",
		revisions,
	});
	const load = jest.fn<Promise<ZtcWorkspaceResult>, [unknown?]>();
	const media = jest.fn().mockResolvedValue([]);
	return {
		data,
		storage,
		check,
		load,
		media,
		resource: new ZtcWorkspaceResource("site-a", storage, load, media, check),
	};
}

it("checks revisions after restoring disk cache without downloading or rewriting unchanged data", async () => {
	const { data, resource, check, load, storage, media } = syncSetup();
	await resource.refresh();
	expect(check).toHaveBeenCalledTimes(1);
	expect(load).not.toHaveBeenCalled();
	expect(media).not.toHaveBeenCalled();
	expect(storage.write).not.toHaveBeenCalled();
	expect(resource.getSnapshot().data).toBe(data);
});

it("downloads and persists only the delta after the revision check reports a change", async () => {
	const { data, resource, check, load, storage, media } = syncSetup();
	check.mockResolvedValue({
		status: "ok",
		siteId: "site-a",
		revisions: { rows: "2", config: "1", media: "1" },
	});
	const delta: ZtcWorkspaceDelta = {
		status: "delta",
		siteId: "site-a",
		sync: {
			version: 1,
			siteId: "site-a",
			revisions: { rows: "2", config: "1", media: "1" },
		},
		changedRows: [{ ...cached.rows[0], Works: "Updated" }],
		deletedRowIds: [],
		rowVersions: { row: "2" },
		changedMedia: [],
		deletedMediaKeys: [],
		mediaVersions: {},
	};
	load.mockResolvedValue(delta);
	await resource.refresh();
	await flush();
	expect(load).toHaveBeenCalledWith(data.sync);
	expect(resource.getSnapshot().data?.rows[0].Works).toBe("Updated");
	expect(resource.getSnapshot().data?.sync?.rows).toEqual({ row: "2" });
	expect(storage.write).toHaveBeenLastCalledWith(resource.getSnapshot().data);
	expect(media).not.toHaveBeenCalled();
});

it("deduplicates slow change checks and evicts cached data when access is revoked", async () => {
	const { resource, check, load, storage } = syncSetup();
	const activity = deferred<ZtcWorkspaceActivity>();
	check.mockReturnValue(activity.promise);
	const request = resource.refresh();
	expect(resource.refresh()).toBe(request);
	await flush();
	activity.resolve({ status: "denied" });
	await expect(request).rejects.toThrow("nav piekļuves");
	await flush();
	expect(load).not.toHaveBeenCalled();
	expect(storage.clear).toHaveBeenCalled();
	expect(resource.getSnapshot().data).toBeNull();
});

it("keeps cached data on a failed activity check and recovers on the next check", async () => {
	const { data, resource, check, load } = syncSetup();
	check.mockRejectedValueOnce(new Error("Offline"));
	await expect(resource.refresh()).rejects.toThrow("Offline");
	expect(resource.getSnapshot().data).toBe(data);
	await resource.refresh();
	expect(resource.getSnapshot().error).toBeNull();
	expect(load).not.toHaveBeenCalled();
});

it("falls back to a full bootstrap when old cached data has no sync metadata or storage fails", async () => {
	const { resource, storage, check, load } = syncSetup();
	storage.read.mockRejectedValueOnce(new Error("IndexedDB unavailable"));
	load.mockResolvedValue({ status: "ok", data: fresh });
	await resource.refresh();
	expect(load).toHaveBeenCalledWith(undefined);
	expect(check).not.toHaveBeenCalled();
	expect(resource.getSnapshot().data?.rows).toEqual(fresh.rows);
});
