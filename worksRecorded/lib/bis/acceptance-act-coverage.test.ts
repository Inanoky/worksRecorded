import { fetchFimaAcceptanceActCoverage } from "./acceptance-act-coverage";

function act(id: string, collection = "other_acceptance_acts") {
	const base = `/bisp/api/portal/bis_cases/668714/logbook/${collection}/${id}`;
	return {
		id,
		type: collection.slice(0, -1),
		attributes: {
			status: "approved",
			doc_number: `KT-${id}`,
			event_date: "2026-10-07",
		},
		relationships: {
			detail: { links: { related: `${base}/detail` } },
			accomplished_works: { links: { related: `${base}/accomplished_works` } },
		},
	};
}

it("reads every register and relationship page, including different act types and partial or zero quantities", async () => {
	const first = act("101");
	const second = act("102", "covered_works_acceptance_acts");
	const get = jest.fn(async (path: string) => {
		const url = new URL(path, "https://bis.gov.lv");
		if (url.pathname.endsWith("logbooks"))
			return url.searchParams.has("page[number]")
				? { data: [second], meta: { pagination: { records: 2 } } }
				: { data: [first], meta: { pagination: { records: 2, next: 2 } } };
		if (url.pathname.includes("/101/"))
			return url.searchParams.has("page[number]")
				? {
						data: [
							{ id: "join2", attributes: { child_id: 588, quantity: "0" } },
						],
						meta: { pagination: { records: 2 } },
					}
				: {
						data: [
							{ id: "join1", attributes: { child_id: 587, quantity: "1.5" } },
						],
						meta: { pagination: { records: 2 } },
						links: { next: `${url.pathname}?page[number]=2&page[size]=100` },
					};
		return { data: [], meta: { pagination: { records: 0 } } };
	});
	const index = await fetchFimaAcceptanceActCoverage("668714", get);
	expect(index.collections).toEqual([
		"covered_works_acceptance_acts",
		"other_acceptance_acts",
	]);
	expect(index.acts).toHaveLength(2);
	expect(index.acts[0].works).toEqual([
		{ id: "587", quantity: 1.5 },
		{ id: "588", quantity: 0 },
	]);
	expect(get).toHaveBeenCalledTimes(5);
});

it.each([
	{ data: [], meta: { pagination: { records: 1 } } },
	{ data: [], links: { next: "https://example.com/page" } },
	{
		data: [act("101")],
		links: { next: "/bisp/api/portal/bis_cases/668708/logbook/logbooks" },
	},
	{},
])(
	"rejects incomplete or out-of-case registers so a failed scan cannot clear existing coverage",
	async (page) => {
		await expect(
			fetchFimaAcceptanceActCoverage("668714", async () => page),
		).rejects.toThrow();
	},
);

it("does not return an index if any act relation fails", async () => {
	const get = jest
		.fn()
		.mockResolvedValueOnce({ data: [act("101")] })
		.mockRejectedValueOnce(new Error("BIS unavailable"));
	await expect(fetchFimaAcceptanceActCoverage("668714", get)).rejects.toThrow(
		"BIS unavailable",
	);
});
