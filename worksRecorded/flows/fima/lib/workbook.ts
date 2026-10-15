import * as XLSX from "xlsx";
import {
	editUrl,
	emptyProposal,
	type FimaRow,
	type Proposal,
	parseMasts,
	type Source,
} from "./records";

export type ImportRow = {
	localId?: string;
	caseName?: string;
	version?: number;
	proposal: Proposal;
	sources: Source[];
	bisId?: string;
	warning: string;
};
const text = (v: unknown) => (v == null ? "" : String(v).trim());
const norm = (v: unknown) =>
	text(v)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();
function date(v: unknown) {
	if (typeof v === "number") {
		const d = XLSX.SSF.parse_date_code(v);
		return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
	}
	const t = text(v);
	const lv = t.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
	return lv ? `${lv[3]}-${lv[2]}-${lv[1]}` : t.slice(0, 10);
}
function time(v: unknown) {
	if (typeof v === "number") {
		const m = Math.round((v % 1) * 1440) % 1440;
		return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
	}
	return text(v).match(/\d{2}:\d{2}/)?.[0] ?? "";
}
function number(v: unknown) {
	if (v == null || v === "") return null;
	const n = Number(text(v).replace(",", "."));
	return Number.isFinite(n) ? n : null;
}
export function parseWorkbook(
	bytes: ArrayBuffer,
	file: string,
	month: string,
	mode: "register" | "kuce",
): ImportRow[] {
	const wb = XLSX.read(bytes, { type: "array", cellDates: false });
	const rows: ImportRow[] = [];
	for (const name of wb.SheetNames) {
		const s = wb.Sheets[name];
		const grid = XLSX.utils.sheet_to_json<unknown[]>(s, {
			header: 1,
			defval: "",
		});
		if (mode === "register") {
			const header = grid.findIndex((r) =>
				r.some((c) => /lokalais id|local id/.test(norm(c))),
			);
			if (header < 0) continue;
			const h = grid[header].map(norm);
			const col = (pattern: RegExp) => h.findIndex((v) => pattern.test(v));
			const columns = {
				id: col(/lokalais id|local id/),
				date: col(/darbu datums|work date/),
				source: col(/kuce.*(apraksts|original)/),
				description: col(/buvconsult.*(bis|piedava)|proposal/),
				masts: col(/balsti|masts/),
				amount: col(/^amounts$|darbu apjoms/),
				unit: col(/^units$|mervieniba/),
				shift: col(/maina|shift/),
				workers: col(/darbinieku|workers/),
				materials: col(/^materiali/),
				link: col(/saite.*bis|bis.*link|bis record/),
				notes: col(/^piezimes|comments/),
			};
			if (
				[columns.date, columns.source, columns.description].some((i) => i < 0)
			)
				throw new Error(
					`Lapā ${name} trūkst datuma, KUCE vai BIS apraksta kolonnas`,
				);
			for (let r = header + 1; r < grid.length; r++) {
				const get = (i: number) => (i < 0 ? "" : grid[r][i]);
				if (!text(get(columns.source)) && !text(get(columns.description)))
					continue;
				const p = emptyProposal(date(get(columns.date)));
				p.sourceWork = text(get(columns.source));
				p.description = String(get(columns.description) ?? "");
				p.rawMasts = text(get(columns.masts));
				p.masts = parseMasts(p.rawMasts);
				p.quantity = number(get(columns.amount));
				p.unit = text(get(columns.unit));
				p.measurement = /^m$/.test(p.unit)
					? "29"
					: /komplekt/i.test(p.unit)
						? "110"
						: "";
				const shift = text(get(columns.shift)).match(
					/(\d{2}:\d{2})\s*[–—-]\s*(\d{2}:\d{2})/,
				);
				p.start = shift?.[1] ?? "";
				p.end = shift?.[2] ?? "";
				p.workers = number(get(columns.workers));
				p.notes = [
					text(get(columns.notes)),
					...h.flatMap((heading, i) =>
						/fima.*(vertejums|komentar)|next step|ieteicamais bis/.test(
							heading,
						) && text(get(i))
							? [`${grid[header][i]}: ${text(get(i))}`]
							: [],
					),
				]
					.filter(Boolean)
					.join("\n\n");
				const evidenceCol = col(/vesturisk|comparative/);
				const evidenceText = text(get(evidenceCol));
				if (evidenceText)
					p.evidence = [
						{
							title: "Vēsturiskie KUCE un BIS piemēri",
							url: evidenceText.match(/https:\/\/[^\s]+/)?.[0] ?? "",
							detail: evidenceText,
						},
					];
				p.materialSource = text(get(columns.materials));
				const linkCell =
					columns.link >= 0
						? s[XLSX.utils.encode_cell({ r, c: columns.link })]
						: undefined;
				const linkText = [
					text(get(columns.link)),
					linkCell?.l?.Target ?? "",
					linkCell?.f ?? "",
				].join(" ");
				const links = [
					...new Set(linkText.match(/performed_works\/\d+/g) ?? []),
				];
				rows.push({
					localId: text(get(columns.id)) || undefined,
					caseName: text(
						get(col(/bis lietas nosaukums|^bis lieta$|^bis case/)),
					),
					version: number(get(col(/^versija$|^version$/))) ?? undefined,
					proposal: p,
					sources: [
						{
							file,
							sheet: name,
							cell: XLSX.utils.encode_cell({
								r,
								c: Math.max(0, columns.source),
							}),
							raw: JSON.stringify(grid[r]),
						},
					],
					bisId:
						links.length === 1 &&
						!/related|saistit|sakritib|iespejam/i.test(norm(get(columns.link)))
							? links[0].split("/")[1]
							: undefined,
					warning: links.length
						? "BIS saite jāpārbauda; imports nedod tiesības mainīt esošo BIS ierakstu."
						: "",
				});
			}
		} else {
			if (!/^\d{1,2}(?:-\d{1,2})?$/.test(name)) continue;
			if (!/^\d{4}-\d{2}$/.test(month))
				throw new Error("Izvēlieties atskaites mēnesi");
			const workDate = `${month}-${String(Number(name.split("-")[0])).padStart(2, "0")}`;
			for (const c of [2, 9, 16, 23]) {
				const get = (r: number, offset = 0) => grid[r]?.[c + offset];
				const people = Array.from({ length: 10 }, (_, i) =>
					text(get(i + 3)),
				).filter(Boolean);
				const shifts = [
					...new Set(
						Array.from({ length: 10 }, (_, i) => [
							time(get(i + 3, 2)),
							time(get(i + 3, 3)),
						])
							.filter((v) => v[0] && v[1])
							.map((v) => v.join("–")),
					),
				];
				let location = text(get(14));
				for (let r = 16; r < Math.min(grid.length, 40); r++) {
					const work = text(get(r));
					if (!work || /^(track machine|m|r|\.)$/i.test(work)) continue;
					if (
						/^(olaine station|olaine\s*-\s*cena|tor[nņ]akalns\s*-\s*olaine|cena\s*-\s*jelgava|jelgava|cena station)$/i.test(
							work,
						)
					) {
						location = work;
						continue;
					}
					const p = emptyProposal(workDate);
					p.sourceWork = work;
					p.rawMasts = text(get(r, 2));
					p.masts = parseMasts(p.rawMasts);
					p.workers = people.length || null;
					if (shifts.length === 1) [p.start, p.end] = shifts[0].split("–");
					p.notes = location;
					rows.push({
						proposal: p,
						sources: [
							{
								file,
								sheet: name,
								cell: XLSX.utils.encode_cell({ r, c }),
								raw: JSON.stringify([work, get(r, 1), get(r, 2), get(r, 4)]),
								crew: `${name}:${c}`,
								workers: people,
							},
						],
						warning:
							shifts.length > 1
								? "Brigādei ir atšķirīgi maiņu laiki; pārbaudiet."
								: "Pārbaudiet KUCE izkārtojumu un objekta piesaisti.",
					});
				}
			}
		}
	}
	if (!rows.length)
		throw new Error(
			"Nav atpazītu darba rindu. Izvēlieties pareizo importa veidu.",
		);
	if (rows.length > 2000)
		throw new Error("Vienā importā atļautas līdz 2000 rindām");
	return rows;
}
export function exportWorkbook(
	rows: FimaRow[],
	siteNames: Record<string, string>,
	bisBase = "https://bis.gov.lv",
) {
	const data = rows.map((r) => ({
		"Lokālais ID": r.localId,
		Statuss:
			(
				{
					draft: "Sagatavojams",
					ready: "Pārbaudīts",
					hold: "Atlikts",
					recorded: "BIS ieraksts",
					executing: "Tiek saglabāts",
					unknown: "Jāpārbauda rezultāts",
					merged: "Apvienots",
				} as Record<string, string>
			)[r.stage] ?? r.stage,
		"Saite uz BIS ierakstu": r.bisId ? editUrl(r.bisId, bisBase) : "",
		"Darbu datums": r.proposal.date,
		"KUCE darbu apraksts (oriģināls)": r.proposal.sourceWork,
		"Buvconsult piedāvātais BIS ieraksts": r.proposal.description,
		Balsti: r.proposal.rawMasts,
		"Darbu apjoms": r.proposal.quantity,
		Mērvienība: r.proposal.unit,
		Materiāli:
			r.proposal.materials
				.map((m) => `${m.name} — ${m.quantity} ${m.unit}`)
				.join("\n") || r.proposal.materialSource,
		Maiņa: `${r.proposal.start}–${r.proposal.end}`,
		"Darbinieku skaits": r.proposal.workers,
		"BIS statuss": r.bisStatus ?? "",
		"BIS lieta": r.bisCaseId ?? "",
		Projekts: siteNames[r.siteId] ?? r.siteId,
		Rasējumi: r.proposal.drawings
			.map((d) => `${d.title} / ${d.sheet} / ${d.revision}`)
			.join("\n"),
		Piezīmes: r.proposal.notes,
		Avots: r.sources.map((s) => `${s.file} '${s.sheet}'!${s.cell}`).join("\n"),
		Versija: r.version,
	}));
	const wb = XLSX.utils.book_new();
	const s = XLSX.utils.json_to_sheet(data);
	s["!autofilter"] = { ref: s["!ref"] ?? "A1:S1" };
	s["!cols"] = [
		{ wch: 14 },
		{ wch: 18 },
		{ wch: 24 },
		{ wch: 14 },
		{ wch: 42 },
		{ wch: 60 },
		{ wch: 24 },
		{ wch: 14 },
		{ wch: 14 },
		{ wch: 45 },
		{ wch: 18 },
		{ wch: 15 },
		{ wch: 18 },
		{ wch: 18 },
		{ wch: 25 },
		{ wch: 40 },
		{ wch: 50 },
		{ wch: 45 },
		{ wch: 10 },
	];
	rows.forEach((r, i) => {
		if (r.bisId) {
			const c = s[XLSX.utils.encode_cell({ r: i + 1, c: 2 })];
			c.l = { Target: editUrl(r.bisId, bisBase) };
		}
	});
	XLSX.utils.book_append_sheet(wb, s, "KUCE vs BIS");
	return wb;
}
