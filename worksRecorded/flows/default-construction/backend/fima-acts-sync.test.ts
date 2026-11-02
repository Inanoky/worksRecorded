import type { FimaActsData } from "@/lib/fima/act-register";
import { mergeFimaActsDelta } from "@/lib/fima/acts-sync";
import { diffFimaActs, versionFimaActs } from "./fima-acts-sync";

const row = (key: string) =>
	({
		key: `act/${key}`,
		id: key,
		siteId: "a",
		number: key,
		setting: { history: [] },
		examples: [],
	}) as unknown as FimaActsData["rows"][number];
const base = () =>
	versionFimaActs({
		siteId: "a",
		siteName: "Site",
		caseId: "668714",
		checkedAt: null,
		rows: [row("1"), row("2"), row("3")],
		choices: [],
		references: [],
	});
it("returns no data for an unchanged register", () => {
	const current = base();
	expect(diffFimaActs(current, current.cache)).toEqual({ kind: "unchanged" });
});
it("sends only changed/new acts and deleted IDs and preserves unaffected client objects", () => {
	const current = base();
	const next = versionFimaActs({
		...current,
		rows: [row("4"), { ...row("1"), title: "Changed" }, current.rows[2]],
	});
	const delta = diffFimaActs(next, current.cache);
	if (delta.kind !== "delta") throw new Error("Expected delta");
	expect(delta.rows.map((row) => row.key)).toEqual(["act/4", "act/1"]);
	expect(delta.removed.rows).toEqual(["act/2"]);
	expect(delta.meta).toBeUndefined();
	const merged = mergeFimaActsDelta(current, delta);
	expect(merged.rows.map((row) => row.key)).toEqual([
		"act/4",
		"act/1",
		"act/3",
	]);
	expect(merged.rows[2]).toBe(current.rows[2]);
});
