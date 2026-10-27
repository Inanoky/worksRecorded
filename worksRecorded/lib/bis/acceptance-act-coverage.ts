import type {
	FimaAcceptanceAct,
	FimaActCoverageIndex,
} from "@/lib/fima/acceptance-acts";

type JsonApiResource = {
	id: string;
	type?: string;
	attributes?: Record<string, unknown>;
	relationships?: Record<string, { links?: { related?: string } }>;
};
type JsonApiPage = {
	data: JsonApiResource[];
	meta?: { pagination?: { records?: number; next?: number } };
	links?: { next?: string };
};

export async function fetchFimaAcceptanceActCoverage(
	caseId: string,
	get: (path: string) => Promise<unknown>,
): Promise<FimaActCoverageIndex> {
	if (!/^\d+$/.test(caseId)) throw new Error("Nederīga BIS lieta.");
	const base = `/bisp/api/portal/bis_cases/${caseId}/logbook/`;
	const readPages = async (initialPath: string) => {
		const data: JsonApiResource[] = [];
		const seen = new Set<string>();
		let next: string | undefined = `${initialPath}?page[size]=100`;
		let total: number | undefined;
		while (next) {
			const url: URL = new URL(next, "https://bis.gov.lv");
			if (
				url.origin !== "https://bis.gov.lv" ||
				!url.pathname.startsWith(base) ||
				seen.has(url.href)
			)
				throw new Error("Nederīga BIS aktu lapošana.");
			seen.add(url.href);
			const page = (await get(url.pathname + url.search)) as JsonApiPage;
			if (!Array.isArray(page.data))
				throw new Error("BIS neatgrieza pilnīgu aktu sarakstu.");
			total ??= page.meta?.pagination?.records;
			data.push(...page.data);
			next = page.links?.next;
			if (!next && page.meta?.pagination?.next) {
				url.searchParams.set("page[number]", String(page.meta.pagination.next));
				next = url.href;
			}
		}
		if (total !== undefined && data.length !== total)
			throw new Error("BIS aktu saraksts nav pilnīgs.");
		return data;
	};
	const acts: FimaAcceptanceAct[] = [];
	const collections = new Set<string>();
	const records = (await readPages(`${base}logbooks`)).filter((record) =>
		record.type?.endsWith("_acceptance_act"),
	);
	let cursor = 0;
	await Promise.all(
		Array.from({ length: Math.min(4, records.length) }, async () => {
			while (cursor < records.length) {
				const record = records[cursor++];
				if (!/^\d+$/.test(record.id))
					throw new Error("BIS aktam nav derīga identifikatora.");
				const detail = new URL(
					record.relationships?.detail?.links?.related ?? "",
					"https://bis.gov.lv",
				);
				const collection = detail.pathname.slice(base.length).split("/")[0];
				if (
					detail.origin !== "https://bis.gov.lv" ||
					!/^\w+_acts$/.test(collection) ||
					detail.pathname !== `${base}${collection}/${record.id}/detail`
				)
					throw new Error("Nederīgs BIS akta veids.");
				collections.add(collection);
				const relation =
					record.relationships?.accomplished_works?.links?.related;
				const expected = `${base}${collection}/${record.id}/accomplished_works`;
				if (new URL(relation ?? "", "https://bis.gov.lv").pathname !== expected)
					throw new Error("BIS aktam nav pārbaudāmu darbu saišu.");
				const works = await readPages(expected);
				const attributes = record.attributes ?? {};
				if (typeof attributes.status !== "string")
					throw new Error("BIS aktam nav statusa.");
				acts.push({
					id: record.id,
					collection,
					number:
						attributes.doc_number == null
							? null
							: String(attributes.doc_number),
					date:
						attributes.event_date == null
							? null
							: String(attributes.event_date),
					status: attributes.status,
					works: works.map((work) => {
						const id = String(work.attributes?.child_id ?? "");
						if (!/^\d+$/.test(id))
							throw new Error("BIS akta darba saite nav derīga.");
						const raw = work.attributes?.quantity;
						const number =
							raw == null || raw === ""
								? null
								: typeof raw === "number" || typeof raw === "string"
									? Number(raw)
									: Number.NaN;
						if (number !== null && (!Number.isFinite(number) || number < 0))
							throw new Error("BIS akta darba apjoms nav derīgs.");
						return { id, quantity: number };
					}),
				});
			}
		}),
	);
	return {
		version: 1,
		caseId,
		fetchedAt: new Date().toISOString(),
		collections: [...collections].sort(),
		acts: acts.sort((a, b) => a.id.localeCompare(b.id)),
	};
}
