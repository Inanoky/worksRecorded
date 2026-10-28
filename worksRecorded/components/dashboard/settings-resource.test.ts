import { createSettingsResource } from "./settings-resource";

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<T>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}

afterEach(() => jest.restoreAllMocks());

it("shares an in-flight preload with navigation and reuses fresh data", async () => {
	const request = deferred<string>();
	const loader = jest.fn(() => request.promise);
	const resource = createSettingsResource(loader);
	const preload = resource.load();
	expect(resource.load()).toBe(preload);
	request.resolve("settings");
	await preload;
	await resource.load();
	expect(loader).toHaveBeenCalledTimes(1);
	expect(resource.getSnapshot()).toMatchObject({
		status: "ready",
		data: "settings",
	});
});

it("keeps cached content visible while revalidating stale data", async () => {
	const now = jest.spyOn(Date, "now").mockReturnValue(100_000);
	const updated = deferred<string>();
	const loader = jest
		.fn()
		.mockResolvedValueOnce("old")
		.mockReturnValueOnce(updated.promise);
	const resource = createSettingsResource<string>(loader);
	await resource.load();
	now.mockReturnValue(160_001);
	const pending = resource.load();
	expect(resource.getSnapshot()).toMatchObject({
		status: "loading",
		data: "old",
	});
	updated.resolve("updated");
	await pending;
	expect(resource.getSnapshot()).toMatchObject({
		status: "ready",
		data: "updated",
	});
});

it("does not let an older request overwrite a post-save refresh", async () => {
	const old = deferred<string>();
	const loader = jest
		.fn()
		.mockReturnValueOnce(old.promise)
		.mockResolvedValueOnce("saved");
	const resource = createSettingsResource<string>(loader);
	const pending = resource.load();
	await resource.refresh();
	old.resolve("old");
	await pending;
	expect(resource.getSnapshot()).toMatchObject({
		status: "ready",
		data: "saved",
	});
});

it("discards in-flight data when another settings page invalidates it", async () => {
	const request = deferred<string>();
	const resource = createSettingsResource(() => request.promise);
	const pending = resource.load();
	resource.clear();
	request.resolve("previous organization");
	await pending;
	expect(resource.getSnapshot()).toMatchObject({ status: "idle", data: null });
});

it("removes cached data on authorization or network failure and allows retry", async () => {
	const loader = jest
		.fn()
		.mockResolvedValueOnce("cached")
		.mockRejectedValueOnce(new Error("forbidden"))
		.mockResolvedValueOnce("retried");
	const resource = createSettingsResource<string>(loader);
	await resource.load();
	await resource.refresh();
	expect(resource.getSnapshot()).toMatchObject({ status: "error", data: null });
	await resource.load();
	expect(resource.getSnapshot()).toMatchObject({
		status: "ready",
		data: "retried",
	});
});
