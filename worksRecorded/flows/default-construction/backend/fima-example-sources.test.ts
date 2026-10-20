const findMany = jest.fn();
jest.mock("@/lib/utils/db", () => ({
	prisma: { sitediaryrecords: { findMany } },
}));

import { readFimaCollaboration } from "@/lib/fima/diary-collaboration";
import {
	buildFimaExampleSourceWhere,
	withFimaExampleSources,
} from "./fima-example-sources";

const example = (id: string) => ({
	id,
	label: `BIS ${id}`,
	url: `https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/${id}`,
});
beforeEach(() => {
	jest.resetAllMocks();
	findMany.mockResolvedValue([]);
});
it("resolves all examples in one organization-scoped query, including sources on other pages or projects", async () => {
	const state = {
		...readFimaCollaboration(null),
		examples: { entries: [example("123"), example("456")] },
	};
	const rows = [
		{ id: "target", fimaCollaboration: state },
		{ id: "other-target", fimaCollaboration: state },
	];
	findMany.mockResolvedValue([
		{
			id: "source-1",
			siteId: "another-project",
			fimaNumber: 42,
			Works: "Console assembly",
			BISId: "123",
			evalMetadata: null,
		},
		{
			id: "source-2",
			siteId: "project",
			fimaNumber: 43,
			Works: "Wire removal",
			BISId: "999",
			evalMetadata: { kuceImport: { bisLinks: [{ id: "123" }, { id: 456 }] } },
		},
	]);
	const enriched = await withFimaExampleSources("org", rows);
	expect(findMany).toHaveBeenCalledTimes(1);
	expect(findMany.mock.calls[0][0].where).toEqual(
		buildFimaExampleSourceWhere("org", ["123", "456"]),
	);
	expect(findMany.mock.calls[0][0].where).toMatchObject({
		archivedAt: null,
		Site: {
			organizationId: "org",
			siteDiaryRecordsMap: {
				path: ["otherSettings", "fimaCollaboration"],
				equals: true,
			},
		},
	});
	expect(
		enriched[0].fimaExampleSources?.["123"].map((source) => source.id),
	).toEqual(["source-1", "source-2"]);
	expect(enriched[0].fimaExampleSources?.["456"]).toEqual([
		{ id: "source-2", siteId: "project", fimaNumber: 43, work: "Wire removal" },
	]);
	expect(enriched[1].fimaExampleSources).toEqual(
		enriched[0].fimaExampleSources,
	);
	expect(enriched[0].fimaExampleSources).not.toHaveProperty("999");
	expect(rows[0]).not.toHaveProperty("fimaExampleSources");
});
it("keeps unavailable sources explicit without guessing from similar work descriptions", async () => {
	const rows = [
		{
			fimaCollaboration: {
				...readFimaCollaboration(null),
				examples: { entries: [example("123")] },
			},
		},
	];
	expect(
		(await withFimaExampleSources("org", rows))[0].fimaExampleSources,
	).toEqual({ "123": [] });
});
it("does not query for non-FIMA rows or empty examples", async () => {
	const rows = [{ fimaCollaboration: readFimaCollaboration(null) }];
	expect(await withFimaExampleSources("org", rows)).toBe(rows);
	expect(findMany).not.toHaveBeenCalled();
});
