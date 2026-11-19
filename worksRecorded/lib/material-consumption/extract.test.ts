import { buildMaterialConsumption, extractMaterialSource } from "./extract";
import { type ConsumptionRecord, summarizeMaterialConsumption } from "./model";

const project = { id: "raudas", name: "Raudas iela, Tukums" };
function record(overrides: Partial<ConsumptionRecord> = {}): ConsumptionRecord {
	return {
		id: "r1",
		siteId: project.id,
		Date: "2026-11-17T10:00:00Z",
		Works: "Estrich",
		originalUserComment: "Estrich 50m² 25 maisi",
		Photos: [],
		...overrides,
	};
}
const used = (rows: ReturnType<typeof extractMaterialSource>) =>
	rows
		.filter((row) => row.kind === "consumed" && row.status === "reported")
		.reduce((sum, row) => sum + (row.bags ?? 0), 0);

it("separates actual consumption, delivery and remaining stock", () => {
	const rows = extractMaterialSource({
		project,
		records: [
			record({
				originalUserComment:
					"Estrich 50m² 100mm\n25 maisi. (30 maisi no noliktavas, atlikums objektā 32 maisi).",
			}),
		],
	});
	expect(rows.map(({ kind, bags }) => ({ kind, bags }))).toEqual([
		{ kind: "consumed", bags: 25 },
		{ kind: "delivered", bags: 30 },
		{ kind: "balance", bags: 32 },
	]);
});

it("counts split children and archived parent together as one source", () => {
	const originalUserComment = "Estrich 226m² 87 maisi";
	const records = [
		record({
			id: "parent",
			archivedAt: "2026-11-18",
			originalUserComment,
			evalMetadata: { cementBags: 87 },
		}),
		record({
			id: "child1",
			originalUserComment,
			evalMetadata: {
				cementBags: 79.116,
				limeniSectionMapping: { sourceRecordId: "parent" },
			},
		}),
		record({
			id: "child2",
			originalUserComment,
			evalMetadata: {
				cementBags: 7.884,
				limeniSectionMapping: { sourceRecordId: "parent" },
			},
		}),
	];
	const entries = buildMaterialConsumption({ records, projects: [project] });
	expect(used(entries)).toBe(87);
	expect(entries[0].recordIds).toEqual(["child1", "child2"]);
});

it("does not count cement again on the film work row", () => {
	const records = [record(), record({ id: "film", Works: "PE plēve" })];
	expect(used(buildMaterialConsumption({ records, projects: [project] }))).toBe(
		25,
	);
});

it("does not use m2 suffixes, dimensions or dates as bags", () => {
	const rows = extractMaterialSource({
		project,
		records: [
			record({
				originalUserComment: "Estrich 54m2\nCementa maisi 27 gab\n4.09.2026",
			}),
		],
	});
	expect(rows.map((row) => row.bags)).toEqual([27]);
	expect(
		used(
			extractMaterialSource({
				project,
				records: [
					record({
						originalUserComment: "140m2 estrich\n65maisi cements\n13.05.26",
					}),
				],
			}),
		),
	).toBe(65);
});

it("recognizes abbreviated līm and both word orders", () => {
	for (const text of [
		"117 līm",
		"Līme 117 gab",
		"117maisi līme",
		"TW 117 maisi",
		"Līme117maisi",
		"117līmes",
	]) {
		const rows = extractMaterialSource({
			project,
			records: [record({ originalUserComment: text, Works: "ThermoWhite" })],
		});
		expect(rows).toHaveLength(1);
		expect(rows[0].material).toBe("thermowhite_glue");
		expect(used(rows)).toBe(117);
	}
});

it("recognizes a compact glue count without inferring from the sender or work title", () => {
	const rows = extractMaterialSource({
		project,
		records: [
			record({ Works: "", originalUserComment: "Spilves iela\n33līmes" }),
		],
	});
	expect(rows[0]).toMatchObject({
		material: "thermowhite_glue",
		bags: 33,
		status: "reported",
	});
});

it("separates used and remaining bags in the same sentence", () => {
	const rows = extractMaterialSource({
		project,
		records: [
			record({
				originalUserComment: "izlietots 40 maisi cements palika 5 maisi",
			}),
		],
	});
	expect(rows.map(({ kind, bags }) => [kind, bags])).toEqual([
		["consumed", 40],
		["balance", 5],
	]);
});

it("preserves multiple work components and materials in one report", () => {
	const rows = extractMaterialSource({
		project,
		records: [
			record({
				originalUserComment:
					"Estrich 15m2\nCementa maisi 7gab\nEstrich 45m2\nCementa maisi 20gab\nTW\nLīme 1gab",
			}),
		],
	});
	expect(rows.map((row) => [row.material, row.bags])).toEqual([
		["cement", 7],
		["cement", 20],
		["thermowhite_glue", 1],
	]);
});

it("separates projects and counts the balcony total plus origin breakdown once", () => {
	const first = { id: "reform", name: "Reformācijas laukums 1" };
	const second = { id: "nometnu", name: "Mazā Nometņu iela 43" };
	const originalUserComment =
		"Reformācijas laukums 1\n32m2\n10 maisi no bāzes\nMazā nometņu iela 43\nPirmais balkons 12m2\n4 maisi no bāzes\nOtrais balkons 8m2\n5maisi\n1 maiss no bāzes 4 maisi no veikala";
	const records = [
		record({
			siteId: first.id,
			originalUserComment,
			evalMetadata: { cementBags: 10 },
		}),
		record({
			id: "b1",
			siteId: second.id,
			originalUserComment,
			evalMetadata: { cementBags: 4 },
		}),
		record({
			id: "b2",
			siteId: second.id,
			originalUserComment,
			evalMetadata: { cementBags: 5 },
		}),
	];
	const totals = summarizeMaterialConsumption(
		[first, second],
		buildMaterialConsumption({ records, projects: [first, second] }),
	);
	expect(totals.map((row) => row.cementBags)).toEqual([10, 9]);
});

it("does not count an origin breakdown again after the reported total", () => {
	const rows = extractMaterialSource({
		project,
		records: [
			record({
				originalUserComment:
					"Ralfs : [18:26, 09.11.2026] +371 26 165 987:\nEstrich 50 maisi\nThermowhite : [08:36, 10.11.2026] +371 29 483 838:\n45 maisi (no bāzes)\n5 maisi Veikals",
				evalMetadata: { cementBags: 50 },
			}),
		],
	});
	expect(used(rows)).toBe(50);
});

it("retains decimal deliveries, excludes big bags and does not infer used bags", () => {
	const rows = extractMaterialSource({
		project,
		records: [
			record({
				Works: "Materiālu piegāde",
				originalUserComment:
					"Cementu piegāde 65.5maisi\nNo objekta savākti 27 big bag ar XPS atgriezumiem",
			}),
		],
	});
	expect(rows).toHaveLength(1);
	expect(rows[0]).toMatchObject({ kind: "delivered", bags: 65.5 });
	expect(used(rows)).toBe(0);
});

it("does not mistake the sender named Thermowhite for the material delivered", () => {
	const rows = extractMaterialSource({
		project,
		records: [
			record({
				Works: "Piezīmes",
				Comments: "Cementa atlikuma precizējums",
				originalUserComment:
					"Thermowhite : [15:27, 10.11.2026] +371 29 484 894:\n45 maisi no veikala, atlikums 25 maisi",
			}),
		],
	});
	expect(rows.map((row) => [row.material, row.kind, row.bags])).toEqual([
		["cement", "delivered", 45],
		["cement", "balance", 25],
	]);
});

it("marks alternatives and uncertain additives for review", () => {
	expect(
		extractMaterialSource({
			project,
			records: [
				record({
					originalUserComment: "Estrich 72m2\n22 vai 23. Dagnis raksta maisus.",
				}),
			],
		})[0],
	).toMatchObject({ bags: null, status: "needs_review" });
	expect(
		extractMaterialSource({
			project,
			records: [
				record({
					originalUserComment: "Estrich ar planekrītu 30m² 10mm 2 maisi",
				}),
			],
		})[0],
	).toMatchObject({ material: "unknown", status: "needs_review" });
});

it("does not infer cement bags for ready-mixed concrete or preparation", () => {
	for (const text of [
		"Transportbetons garāžā 38.5m2",
		"8 logu ailes sagatavošana betonēšanai",
		"TW izņemšana",
		"Estrich demontāža",
	])
		expect(
			extractMaterialSource({
				project,
				records: [record({ originalUserComment: text })],
			}),
		).toEqual([]);
});

it("retains a missing-bags warning for completed Estrich alongside TW scraping", () => {
	expect(
		extractMaterialSource({
			project,
			records: [
				record({
					originalUserComment:
						"Raudas 16. Estrich, plēve 80m², 60mm. TW nokasīšana slānim.",
				}),
			],
		})[0],
	).toMatchObject({ material: "cement", bags: null, status: "needs_review" });
});

it("excludes rejected sources and records archived without active children", () => {
	expect(
		buildMaterialConsumption({
			projects: [project],
			records: [
				record({ evalMetadata: { sourceMessageId: "3EB0DDCB0CBE3B1B747F9E" } }),
			],
		}),
	).toEqual([]);
	expect(
		buildMaterialConsumption({
			projects: [project],
			records: [record({ archivedAt: "2026-11-18" })],
		}),
	).toEqual([]);
});

it("deduplicates structured observations shared by film and split work rows", () => {
	const observations = extractMaterialSource({ project, records: [record()] });
	const rows = [
		record({ evalMetadata: { materialConsumption: observations } }),
		record({
			id: "r2",
			Photos: ["https://files.ufs.sh/f/original"],
			evalMetadata: { materialConsumption: observations },
		}),
	];
	const entries = buildMaterialConsumption({
		records: rows,
		projects: [project],
	});
	expect(used(entries)).toBe(25);
	expect(entries[0].photos).toContain("https://files.ufs.sh/f/original");
});
