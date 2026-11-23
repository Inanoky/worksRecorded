import type { ReviewedDiaryCorpus } from "./reviewed-diary-cases";
import { reviewedDiaryUnit } from "./reviewed-diary-validators";

const escapeHtml = (value: unknown) =>
	String(value ?? "—").replace(
		/[&<>"']/g,
		(character) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				character
			] as string,
	);

export function renderProjectDiaryCorpusReview(corpora: ReviewedDiaryCorpus[]) {
	const records = (
		rows: ReviewedDiaryCorpus["cases"][number]["expectedRecords"],
		project: ReviewedDiaryCorpus["project"],
	) =>
		`<table><thead><tr>${["Datums", "Darbs", "Apjoms", "Vienība", "Darbinieki", "Stundas", "Vieta", "Forma2 / piesaistes pamats", "Pašreizējais komentārs"].map((label) => `<th>${label}</th>`).join("")}</tr></thead><tbody>${rows
			.map((row) => {
				const position = project.positions.find(
					(item) => item.id === row.forma2PositionId,
				);
				const unitConflict =
					row.amount !== null &&
					row.unit &&
					position?.unit &&
					reviewedDiaryUnit(row.unit) !== reviewedDiaryUnit(position.unit);
				const assignment = position
					? `${position.code} ${position.name} (${position.unit}); ${row.provenance.assignmentBasis}${unitConflict ? "; Jāpārbauda: ieraksta un kataloga mērvienības atšķiras." : ""}`
					: row.provenance.assignmentBasis;
				return `<tr>${[row.dateISO, row.work, row.amount, row.unit, row.workers, row.hours, row.location, assignment, row.reviewedComment].map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`;
			})
			.join("")}</tbody></table>`;
	return `<!doctype html><html lang="lv"><meta charset="utf-8"><title>Projektu dienasgrāmatas etalona pārskats</title><style>body{font:15px/1.55 system-ui;margin:28px;color:#17212b;background:#f4f6f8}main{max-width:1600px;margin:auto}section,article{background:white;padding:20px;margin:20px 0;border:1px solid #d9e0e5;border-radius:8px}table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}td,th{border:1px solid #d9e0e5;padding:8px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#eef2f6}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#eef2f6;padding:16px}.review{border-left:4px solid #c18a13}.meta{color:#536170}h1,h2,h3{line-height:1.3}summary{cursor:pointer;font-weight:600}</style><main><h1>Projektu oriģinālo ziņu kvalitātes etalons</h1><p>Šis ir atsauces datu pārskats. Modeļi nav palaisti. Vērtējamajiem piemēriem salīdzina pilnu oriģinālo ievadi ar projekta pašreizējiem ierakstiem; autora prefikss ir noņemts. Pareizās atbildes modelim netiek padotas.</p><table><thead><tr><th>Organizācija</th><th>Projekts</th><th>Ziņu periods</th><th>Piemēri</th><th>Ieraksti</th><th>Forma2 pozīcijas</th><th>Tikai pārskatīšanai</th></tr></thead><tbody>${corpora.map((corpus) => `<tr>${[corpus.provenance.organization, corpus.provenance.project, `${corpus.provenance.sourcePeriodStart} – ${corpus.provenance.sourcePeriodEnd}`, corpus.cases.length, corpus.cases.reduce((sum, item) => sum + item.expectedRecords.length, 0), corpus.project.positions.length, corpus.referenceCandidates.length].map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`).join("")}</tbody></table>${corpora.map((corpus) => `<section><h2>${escapeHtml(corpus.provenance.organization)} / ${escapeHtml(corpus.provenance.project)}</h2><p class="meta">Kopa: ${escapeHtml(corpus.project.key)}. Momentuzņēmums: ${escapeHtml(corpus.provenance.snapshotDate)}. ${corpus.project.positions.length ? "Tiek izmantots tikai šī projekta Forma2 katalogs." : "Projektam nav Forma2 kataloga. Tiek pārbaudītas konfigurētās darbu kategorijas un nepieļautas izdomātas Forma2 saites."}</p><p>${escapeHtml(corpus.provenance.reviewBasis)}</p><h3>Vērtējamie pilno ziņu piemēri</h3>${corpus.cases.map((item) => `<article><h3>${escapeHtml(item.id)}</h3><p class="meta">Saņemšanas datums: ${escapeHtml(item.receivedDateISO)}. ${escapeHtml(item.tags.join(", "))}</p><pre>${escapeHtml(item.sourceText)}</pre>${records(item.expectedRecords, corpus.project)}<p class="meta">Avota nospiedums: ${escapeHtml(item.sourceFingerprint)}</p></article>`).join("")}<h3>Atsauces pāri, kuri vēl nav vērtējamajā atlasē</h3><p>Šos ierakstus nevar automātiski uzskatīt par prasību modelim. Vispirms jāpārbauda norādītās konteksta un atsauces problēmas.</p>${corpus.referenceCandidates.map((item) => `<details class="review"><summary>${escapeHtml(item.id)} · ${escapeHtml(item.receivedDateISO)} · ${escapeHtml(item.issues.join(", "))}</summary><pre>${escapeHtml(item.sourceText)}</pre>${records(item.expectedRecords, corpus.project)}</details>`).join("")}</section>`).join("")}</main></html>`;
}
