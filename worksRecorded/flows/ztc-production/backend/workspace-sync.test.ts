import type { Prisma } from "@prisma/client";
import type { ZtcWorkspaceSync } from "../lib/ztc-workspace-data";
import {
	loadZtcSyncMetadata,
	loadZtcWorkspaceSync,
	readZtcSync,
} from "./workspace-sync";

const scope = { siteId: "site", organizationId: "org" };
const meta = (id: string, revision: string, day = "2026-11-06") => ({
	id,
	revision,
	Date: new Date(`${day}T10:00:00Z`),
	Date_Custom_1: null,
	Location: "Project A",
});
function setup() {
	const state = {
		rows: [meta("a", "90"), meta("b", "100")],
		config: "config-one",
		media: "photos-one",
	};
	const photo = jest.fn().mockResolvedValue([]);
	const query = jest
		.fn()
		.mockImplementation((strings: TemplateStringsArray) =>
			Promise.resolve(
				strings.join("").includes('FROM "ZTCrecords"')
					? state.rows
					: [{ config: state.config, media: state.media }],
			),
		);
	const tx = {
		$queryRaw: query,
		ztcPhoto: { findMany: photo },
	} as unknown as Prisma.TransactionClient;
	const loaders = {
		rows: jest
			.fn()
			.mockImplementation(async (_tx, _scope, ids: string[]) =>
				ids.map((id) => ({ id, Date: "2026-11-06", Works: `Work ${id}` })),
			),
		config: jest.fn().mockResolvedValue({ otherSettings: { title: "Config" } }),
		rates: jest.fn().mockReturnValue([]),
	};
	const bootstrap = async () => {
		const result = await loadZtcWorkspaceSync(tx, scope, undefined, loaders);
		if (result.status !== "ok" || !result.data.sync)
			throw new Error("Expected snapshot");
		return result.data.sync;
	};
	return { state, tx, loaders, photo, query, bootstrap };
}

it("bootstraps a complete workspace and consistent sync metadata", async () => {
	const { tx, loaders } = setup();
	const result = await loadZtcWorkspaceSync(tx, scope, undefined, loaders);
	expect(result).toMatchObject({
		status: "ok",
		data: {
			rows: [{ id: "a" }, { id: "b" }],
			projectOptions: ["Project A"],
			mediaOnlyDays: [],
			sync: { version: 1, siteId: "site", rows: { a: "90", b: "100" } },
		},
	});
	expect(loaders.rows).toHaveBeenCalledWith(tx, scope, ["a", "b"]);
});

it("only reads revision metadata when nothing has changed", async () => {
	const { tx, loaders, photo, bootstrap } = setup();
	const known = await bootstrap();
	jest.clearAllMocks();
	expect(await loadZtcWorkspaceSync(tx, scope, known, loaders)).toEqual({
		status: "unchanged",
		siteId: "site",
	});
	expect(loaders.rows).not.toHaveBeenCalled();
	expect(loaders.config).not.toHaveBeenCalled();
	expect(photo).not.toHaveBeenCalled();
});

it("fetches one edited row and returns deleted IDs without resending settings or photos", async () => {
	const { state, tx, loaders, photo, bootstrap } = setup();
	const known = await bootstrap();
	state.rows = [meta("a", "101")];
	jest.clearAllMocks();
	const result = await loadZtcWorkspaceSync(tx, scope, known, loaders);
	expect(result).toMatchObject({
		status: "delta",
		changedRows: [{ id: "a" }],
		deletedRowIds: ["b"],
		rowVersions: { a: "101" },
		changedMedia: [],
	});
	expect(result).not.toHaveProperty("rowOrder");
	expect(loaders.rows).toHaveBeenCalledWith(tx, scope, ["a"]);
	expect(result).not.toHaveProperty("config");
	expect(result).not.toHaveProperty("rates");
	expect(loaders.config).not.toHaveBeenCalled();
	expect(photo).toHaveBeenCalledTimes(1);
});

it("detects a lower audit ID committing later while the largest ID stays unchanged", async () => {
	const { state, tx, loaders, bootstrap } = setup();
	const known = await bootstrap();
	state.rows[0].revision = "95";
	jest.clearAllMocks();
	const result = await loadZtcWorkspaceSync(tx, scope, known, loaders);
	expect(result).toMatchObject({ status: "delta", changedRows: [{ id: "a" }] });
	expect(loaders.rows).toHaveBeenCalledWith(tx, scope, ["a"]);
});

it("fetches only settings and rates for a configuration change", async () => {
	const { state, tx, loaders, photo, bootstrap } = setup();
	const known = await bootstrap();
	state.config = "config-two";
	jest.clearAllMocks();
	const result = await loadZtcWorkspaceSync(tx, scope, known, loaders);
	expect(result).toMatchObject({
		status: "delta",
		config: { otherSettings: { title: "Config" } },
		rates: [],
		changedRows: [],
		changedMedia: [],
	});
	expect(loaders.rows).not.toHaveBeenCalled();
	expect(photo).not.toHaveBeenCalled();
});

it("sends only edited and removed photo-day summaries", async () => {
	const { state, tx, loaders, photo, bootstrap } = setup();
	photo.mockResolvedValue([
		{ Date: new Date("2026-11-06T10:00:00Z"), Comment: "old", Location: "A" },
		{
			Date: new Date("2026-11-05T10:00:00Z"),
			Comment: "removed",
			Location: "A",
		},
	]);
	const known = await bootstrap();
	state.media = "photos-two";
	photo.mockResolvedValue([
		{ Date: new Date("2026-11-06T10:00:00Z"), Comment: "new", Location: "A" },
	]);
	loaders.rows.mockClear();
	const result = await loadZtcWorkspaceSync(tx, scope, known, loaders);
	expect(result).toMatchObject({
		status: "delta",
		changedRows: [],
		changedMedia: [
			{ key: "2026-11-06", searchableText: "new A", hasDiaryRecords: true },
		],
		deletedMediaKeys: ["2026-11-05"],
	});
	expect(loaders.rows).not.toHaveBeenCalled();
});

it("includes authorization scope and cancelled-row filtering in revision queries", async () => {
	const { tx, query } = setup();
	await loadZtcSyncMetadata(tx, scope);
	const [strings, ...values] = query.mock.calls[0];
	expect(strings.join("")).toContain('r."siteId" = ');
	expect(strings.join("")).toContain('r."organizationId" = ');
	expect(strings.join("")).toContain("ORDER BY id DESC LIMIT 1");
	expect(values).toContain("org");
	expect(values).toContain("site");
	expect(values).toContain("__ZTC_CANCELLED__");
});

it("rejects sync manifests from another site or incompatible cache version", async () => {
	const { tx, loaders, bootstrap } = setup();
	const known = await bootstrap();
	expect(readZtcSync({ ...known, siteId: "other" }, "site")).toBeUndefined();
	expect(readZtcSync({ ...known, version: 2 }, "site")).toBeUndefined();
	loaders.rows.mockClear();
	const result = await loadZtcWorkspaceSync(
		tx,
		scope,
		{ ...known, siteId: "other" } as ZtcWorkspaceSync,
		loaders,
	);
	expect(result.status).toBe("ok");
	expect(loaders.rows).toHaveBeenCalledWith(tx, scope, ["a", "b"]);
});
