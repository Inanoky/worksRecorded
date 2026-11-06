import type {
	ZtcWorkspaceData,
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
