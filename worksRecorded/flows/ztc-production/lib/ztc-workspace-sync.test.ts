import type { ZtcWorkspaceData, ZtcWorkspaceDelta } from "./ztc-workspace-data";
import {
	applyZtcWorkspaceDelta,
	getZtcWorkspaceFilledDays,
} from "./ztc-workspace-sync";

const revisions = { rows: "one", config: "one", media: "one" };
const base: ZtcWorkspaceData = {
	siteId: "site",
	config: {},
	rates: [],
	projectOptions: [],
	mediaOnlyDays: [],
	rows: [
		{ id: "a", Date: "2026-11-06", Works: "First" },
		{ id: "b", Date: "2026-11-05", Works: "Second" },
	],
	sync: {
		version: 1,
		siteId: "site",
		revisions,
		rows: { a: "1", b: "1" },
		media: {},
	},
};
const delta = (
	changes: Partial<ZtcWorkspaceDelta> = {},
): ZtcWorkspaceDelta => ({
	status: "delta",
	siteId: "site",
	sync: {
		version: 1,
		siteId: "site",
		revisions: { ...revisions, rows: "two" },
	},
	changedRows: [],
	deletedRowIds: [],
	changedMedia: [],
	deletedMediaKeys: [],
	rowVersions: {},
	mediaVersions: {},
	...changes,
});

it("merges only edited rows and preserves object identity for unchanged rows", () => {
	const result = applyZtcWorkspaceDelta(
		base,
		delta({
			changedRows: [{ ...base.rows[0], Works: "Edited" }],
			rowVersions: { a: "2" },
		}),
	);
	expect(result.rows[0].Works).toBe("Edited");
	expect(result.rows[1]).toBe(base.rows[1]);
	expect(result.sync?.rows).toEqual({ a: "2", b: "1" });
	expect(result.config).toBe(base.config);
	expect(result.rates).toBe(base.rates);
	expect(base.rows[0].Works).toBe("First");
});

it("removes deleted rows and their revision metadata without downloading a new order", () => {
	const result = applyZtcWorkspaceDelta(base, delta({ deletedRowIds: ["a"] }));
	expect(result.rows).toEqual([base.rows[1]]);
	expect(result.sync?.rows).toEqual({ b: "1" });
});

it("places new or moved rows in the server's order", () => {
	const result = applyZtcWorkspaceDelta(
		base,
		delta({
			changedRows: [{ id: "c", Date: "2026-11-07", Works: "New" }],
			rowVersions: { c: "1" },
			rowOrder: ["c", "b", "a"],
		}),
	);
	expect(result.rows.map((row) => row.id)).toEqual(["c", "b", "a"]);
	expect(Object.keys(result.sync?.rows ?? {})).toEqual(["c", "b", "a"]);
});

it("keeps rows intact when only settings change", () => {
	const result = applyZtcWorkspaceDelta(
		base,
		delta({
			sync: {
				version: 1,
				siteId: "site",
				revisions: { ...revisions, config: "two" },
			},
			config: { width: 120 },
			rates: [],
		}),
	);
	expect(result.rows).toBe(base.rows);
	expect(result.config).toEqual({ width: 120 });
});

it("rejects another site's delta or incomplete ordering without altering the cache", () => {
	expect(() =>
		applyZtcWorkspaceDelta(base, delta({ siteId: "other" })),
	).toThrow();
	expect(() =>
		applyZtcWorkspaceDelta(base, delta({ rowOrder: ["missing"] })),
	).toThrow();
	expect(base.rows).toHaveLength(2);
});

it("updates calendar highlights from synchronized rows and photo summaries without a server query", () => {
	const data: ZtcWorkspaceData = {
		...base,
		rows: [
			{ ...base.rows[0], Date_Custom_1: "2026-10-30T12:00:00Z" },
			base.rows[1],
		],
		mediaOnlyDays: [
			{
				key: "2026-11-07",
				date: new Date("2026-11-07T12:00:00Z"),
				photoCount: 1,
				latestPhotoDate: new Date("2026-11-07T12:00:00Z"),
				searchableText: "",
				hasDiaryRecords: false,
			},
		],
	};
	expect(getZtcWorkspaceFilledDays(data, 2026, 10)).toEqual([5, 6, 7]);
	const updated = applyZtcWorkspaceDelta(data, delta({ deletedRowIds: ["a"] }));
	expect(getZtcWorkspaceFilledDays(updated, 2026, 10)).toEqual([5, 7]);
});
