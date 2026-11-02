import {
	diffFimaActs,
	versionFimaActs,
} from "@/flows/default-construction/backend/fima-acts-sync";
import { createFimaActsResource } from "./acts-resource";

const base = () =>
	versionFimaActs({
		siteId: "a",
		siteName: "Olaine",
		caseId: "668714",
		checkedAt: null,
		rows: [],
		choices: [],
		references: [],
	});
it("restores Acts immediately and checks only the delta after remounting", async () => {
	const data = base();
	const cache = {
		read: jest.fn().mockResolvedValue(data),
		write: jest.fn().mockResolvedValue(undefined),
	};
	let done!: (value: { kind: "unchanged" }) => void;
	const full = jest.fn();
	const delta = jest.fn().mockImplementation(
		() =>
			new Promise((resolve) => {
				done = resolve;
			}),
	);
	const resource = createFimaActsResource(full, async () => {}, {
		persistence: () => cache,
		loadDelta: delta,
	});
	const work = resource.load("a");
	await Promise.resolve();
	await Promise.resolve();
	expect(resource.get("a").data).toBe(data);
	expect(full).not.toHaveBeenCalled();
	done({ kind: "unchanged" });
	await work;
	expect(delta).toHaveBeenCalledWith("a", data.cache);
	await resource.load("a");
	expect(delta).toHaveBeenCalledTimes(1);
});
it("merges changed Acts metadata and retains cache data during an outage", async () => {
	const data = base();
	const next = versionFimaActs({ ...data, siteName: "Updated name" });
	const cache = {
		read: jest.fn().mockResolvedValue(data),
		write: jest.fn().mockResolvedValue(undefined),
	};
	const full = jest.fn();
	const delta = jest.fn().mockResolvedValue(diffFimaActs(next, data.cache));
	const resource = createFimaActsResource(full, async () => {}, {
		persistence: () => cache,
		loadDelta: delta,
	});
	await resource.load("a");
	expect(resource.get("a").data?.siteName).toBe("Updated name");
	delta.mockRejectedValue(new Error("Network"));
	await resource.load("a", true);
	expect(resource.get("a").data?.siteName).toBe("Updated name");
	expect(full).not.toHaveBeenCalled();
});
it("clears cached Acts after explicit access denial", async () => {
	const cache = {
		read: jest.fn().mockResolvedValue(base()),
		write: jest.fn().mockResolvedValue(undefined),
	};
	const resource = createFimaActsResource(jest.fn(), async () => {}, {
		persistence: () => cache,
		loadDelta: jest.fn().mockResolvedValue({ kind: "denied" }),
	});
	await resource.load("a");
	expect(resource.get("a").data).toBeNull();
	expect(cache.write).toHaveBeenLastCalledWith(null);
});
it("keeps a confirmed local edit when an older background delta completes", async () => {
	const data = base();
	const cache = {
		read: jest.fn().mockResolvedValue(data),
		write: jest.fn().mockResolvedValue(undefined),
	};
	let done!: (delta: ReturnType<typeof diffFimaActs>) => void;
	const resource = createFimaActsResource(jest.fn(), async () => {}, {
		persistence: () => cache,
		loadDelta: () =>
			new Promise((resolve) => {
				done = resolve;
			}),
	});
	const work = resource.load("a");
	await Promise.resolve();
	await Promise.resolve();
	resource.update({ ...data, siteName: "Local saved" });
	done(
		diffFimaActs(versionFimaActs({ ...data, siteName: "Older" }), data.cache),
	);
	await work;
	expect(resource.get("a").data?.siteName).toBe("Local saved");
});
it("loads everything once for an empty cache and persists it", async () => {
	const data = base();
	const cache = {
		read: jest.fn().mockResolvedValue(undefined),
		write: jest.fn().mockResolvedValue(undefined),
	};
	const full = jest.fn().mockResolvedValue(data);
	const resource = createFimaActsResource(full, async () => {}, {
		persistence: () => cache,
	});
	await Promise.all([resource.load("a"), resource.load("a")]);
	expect(full).toHaveBeenCalledTimes(1);
	expect(cache.write).toHaveBeenCalledWith(data);
});
