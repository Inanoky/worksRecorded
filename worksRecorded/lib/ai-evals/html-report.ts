import type { NormalizedEvalItem, NormalizedEvalRun } from "./report-loader";

function escapeHtml(value: unknown): string {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function list(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function value(row: Record<string, unknown>, keys: string[]) {
	for (const key of keys) {
		if (row[key] !== undefined) return row[key];
	}
	return null;
}

function json(value: unknown) {
	return escapeHtml(JSON.stringify(value, null, 2) ?? "null");
}

function badge(status: string) {
	const labels: Record<string, string> = {
		pass: "IZIET",
		fail: "NEIZIET",
		warn: "JĀPĀRSKATA",
		unknown: "NAV NOVĒRTĒTS",
	};
	const safeStatus = Object.hasOwn(labels, status) ? status : "unknown";
	return `<span class="badge ${safeStatus}">${labels[safeStatus]}</span>`;
}

function rowTable(rows: unknown[]) {
	if (!rows.length) return '<p class="muted">Nav ierakstu.</p>';
	const columns = [
		{ label: "Darbs", keys: ["work", "Works"] },
		{ label: "Datums", keys: ["dateISO", "Date"] },
		{ label: "Apjoms", keys: ["amount", "Amounts"] },
		{ label: "Mērv.", keys: ["unit", "Units"] },
		{ label: "Darbinieki", keys: ["workers", "WorkersInvolved"] },
		{ label: "Stundas", keys: ["hours", "TimeInvolved"] },
		{ label: "Forma2 pozīcija", keys: ["forma2PositionId", "positionId"] },
	];
	return `<div class="table-scroll"><table><thead><tr>${columns.map((column) => `<th scope="col">${column.label}</th>`).join("")}</tr></thead><tbody>${rows
		.map((item) => {
			const row = record(item);
			return `<tr>${columns
				.map((column) => {
					const cell = value(row, column.keys);
					return `<td>${cell === null ? '<span class="muted">null</span>' : escapeHtml(cell)}</td>`;
				})
				.join("")}</tr>`;
		})
		.join("")}</tbody></table></div>`;
}

function renderPromptComposition(value: unknown, phase: unknown) {
	const composition = record(value);
	const sections = list(composition.sections).map(record);
	if (!sections.length) return "";
	return `<section class="prompt-composition"><h4>${phase === "extraction_prompt" ? "Ekstraktora" : "Checker"} prompta daļas</h4><p>Profils: ${escapeHtml(composition.profile)} · Versija: ${escapeHtml(composition.version)}</p><div class="table-scroll"><table><thead><tr><th>Daļa</th><th>Mērķis</th><th>Izvēle</th><th>Pamatojums</th></tr></thead><tbody>${sections.map((section) => `<tr><td><strong>${escapeHtml(section.title)}</strong><br><code>${escapeHtml(section.id)} (v${escapeHtml(section.version)})</code></td><td>${escapeHtml(section.description)}</td><td>${section.included === true ? "Iekļauta" : "Izlaista"}</td><td>${escapeHtml(section.reason)}</td></tr>`).join("")}</tbody></table></div></section>`;
}

function renderModelDiagnostics(item: NormalizedEvalItem) {
	const calls = list(item.artifacts.modelCalls)
		.map(record)
		.filter((call) => Object.keys(record(call.diagnostics)).length);
	if (!calls.length) return "";
	const display = (value: unknown) =>
		value == null ? "nav datu" : escapeHtml(value);
	return `<section class="model-diagnostics"><h3>Modeļu API diagnostika</h3><p class="muted">Pirmais datu baits nenozīmē pirmo atbildes tokenu. Nezināms tokenu patēriņš nav nulle.</p><div class="table-scroll"><table><thead><tr><th>Izsaukums</th><th>Rezultāts / posms</th><th>HTTP</th><th>Galvenes / pirmais baits / pilna atbilde, ms</th><th>OpenAI apstrāde, ms</th><th>Tokeni</th><th>Pieprasījumu ID</th></tr></thead><tbody>${calls
		.map((call) => {
			const diagnostic = record(call.diagnostics);
			return `<tr><td>${display(call.purpose)}<br>${display(call.model)}</td><td>${display(diagnostic.outcome)} / ${display(diagnostic.phase)}<br>OpenAI: ${display(diagnostic.responseStatus)} / ${display(diagnostic.incompleteReason)}<br>${display(diagnostic.errorName)} / ${display(diagnostic.errorCode)}</td><td>${display(diagnostic.httpStatus)}</td><td>${display(diagnostic.headersMs)} / ${display(diagnostic.firstBodyByteMs)} / ${display(diagnostic.bodyCompleteMs)}</td><td>${display(diagnostic.serverProcessingMs)}</td><td>${display(call.totalTokens)}<br>Reasoning: ${display(call.reasoningTokens ?? record(diagnostic.usage).reasoningTokens)}</td><td>Klienta: ${display(diagnostic.clientRequestId)}<br>OpenAI: ${display(diagnostic.requestId)}</td></tr>`;
		})
		.join("")}</tbody></table></div></section>`;
}

function renderCase(item: NormalizedEvalItem, index: number) {
	let traceLink = "";
	try {
		const url = new URL(String(item.artifacts.langsmithUrl ?? ""));
		if (
			url.protocol === "https:" &&
			(url.hostname === "smith.langchain.com" ||
				url.hostname === "eu.smith.langchain.com")
		)
			traceLink = `<p><a href="${escapeHtml(url.href)}" target="_blank" rel="noreferrer">Skatīt pilno izpildi LangSmith</a></p>`;
	} catch {}
	const traces = list(item.artifacts.structuredSaveTrace).map(record);
	const expected = traces.flatMap((trace) => list(trace.expectedRecords));
	const generated = traces.flatMap((trace) => list(trace.mappedRows));
	const persisted = traces.flatMap((trace) => list(trace.persistedRecords));
	const stages = traces.flatMap((trace) => list(trace.stages)).map(record);
	const checks = item.validationResults;
	const issues = [
		...item.failedValidators.map((check) => `${check.name}: ${check.message}`),
		...item.warningValidators.map((check) => `${check.name}: ${check.message}`),
		...item.anomalies.map((issue) => `${issue.code}: ${issue.message}`),
	];
	return `<article id="case-${index + 1}" class="case">
    <header class="case-heading"><h2>${index + 1}. ${escapeHtml(item.label)}</h2>${badge(item.status)}</header>
    <p class="meta">${(item.latencyMs / 1000).toFixed(2)} s · Tokeni: ${item.tokenTotal ?? "nav datu"} · Pieprasītais modelis: ${escapeHtml(item.requestedModel ?? "nav datu")} · Faktiskais modelis: ${escapeHtml(item.actualModel ?? "nav apstiprināts")}</p>
    <h3>Lietotāja pieprasījums</h3><pre class="source">${escapeHtml(item.input)}</pre>
    ${traceLink}
    ${issues.length ? `<section class="issues"><h3>Kļūdas un brīdinājumi</h3><ul>${issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul></section>` : ""}
    ${expected.length ? `<h3>Sagaidāmie ieraksti (${expected.length})</h3>${rowTable(expected)}` : ""}
    ${traces.length ? `<h3>Ģenerētie ieraksti (${generated.length})</h3>${rowTable(generated)}` : ""}
    ${renderModelDiagnostics(item)}
    ${stages.length ? `<h3>Izpildes soļi un checker lēmumi</h3>${stages.map((stage) => `<details${stage.phase === "checker" || stage.phase === "failure" ? " open" : ""}><summary>${escapeHtml(stage.phase)}${stage.repair ? " · labošana" : ""}</summary>${renderPromptComposition(stage.promptComposition, stage.phase)}<pre>${json(stage)}</pre></details>`).join("")}` : ""}
    ${persisted.length ? `<details><summary>Datubāzē saglabātie ieraksti (${persisted.length})</summary>${rowTable(persisted)}</details>` : ""}
    ${item.answer ? `<details${traces.length ? "" : " open"}><summary>Aģenta atbilde</summary><pre>${escapeHtml(item.answer)}</pre></details>` : ""}
    ${item.outboundMessages.length ? `<details><summary>WhatsApp atbildes testā</summary><pre>${escapeHtml(item.outboundMessages.join("\n\n"))}</pre></details>` : ""}
    ${item.judgeExplanation ? `<h3>Vērtētāja secinājums</h3><pre>${escapeHtml(item.judgeExplanation)}</pre>` : ""}
    <details><summary>Visas pārbaudes (${checks.length})</summary><ul class="checks">${checks.map((check) => `<li>${badge(check.status)} <strong>${escapeHtml(check.name)}</strong><p>${escapeHtml(check.message)}</p></li>`).join("")}</ul></details>
    <details><summary>Modeļu izsaukumi, rīki un pilni rezultātu dati</summary><pre>${json(item.artifacts)}</pre></details>
  </article>`;
}

export function renderEvalReportHtml(run: NormalizedEvalRun) {
	const raw = record(run.raw);
	const passed = run.items.filter((item) => item.status === "pass").length;
	const failed = run.items.filter((item) => item.status === "fail").length;
	const started = run.startedAt ? new Date(run.startedAt) : null;
	const time =
		started && !Number.isNaN(started.getTime())
			? new Intl.DateTimeFormat("lv-LV", {
					dateStyle: "medium",
					timeStyle: "medium",
					timeZone: "Europe/Riga",
				}).format(started)
			: "nav datu";
	const mode =
		raw.databaseWrites === false
			? "Fiksēta datu kopa. Datubāzes rakstīšana ir izslēgta."
			: "Pilnās plūsmas tests. Datubāzes darbības nosaka eval palaidējs.";
	const mediaNames = [
		...new Set(
			list(raw.localMedia).flatMap((item) => {
				const media = record(item);
				const match = String(media.url ?? "").match(
					/^https:\/\/eval\.test\/local-media\/([a-f0-9]{64}\.jpg)$/,
				);
				return match && String(media.path ?? "").endsWith(`/${match[1]}`)
					? [match[1]]
					: [];
			}),
		),
	];
	return `<!doctype html>
<html lang="lv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' file:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>AI eval · ${escapeHtml(run.flow)} · ${escapeHtml(run.runId)}</title>
<style>
:root{color-scheme:light;font:15px/1.5 system-ui,sans-serif;color:#17242f;background:#f3f6f8}*{box-sizing:border-box}body{margin:0}main{max-width:1440px;margin:auto;padding:40px 28px 70px}h1{font-size:32px;letter-spacing:-.035em;margin:0 0 8px}h2{font-size:20px;margin:0;overflow-wrap:anywhere}h3{font-size:15px;margin:24px 0 8px}p{margin:8px 0}.eyebrow{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#466078}.meta,.muted{color:#617282}.meta{font-size:13px}.badge{display:inline-block;font-size:11px;line-height:1.5;font-weight:750;letter-spacing:.04em;border-radius:4px;padding:5px 9px;white-space:nowrap;background:#e9edf1;color:#425466}.pass{background:#e2f3e9;color:#145c37}.fail{background:#fde8e6;color:#a5231d}.warn{background:#fff1cf;color:#795300}.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:28px 0}.card,.case,nav{background:white;border:1px solid #dce3e9;border-radius:9px}.card{padding:16px}.card b{display:block;font-size:26px}.card span{font-size:13px;color:#617282}nav{padding:18px 22px;margin-bottom:26px}nav ol{margin:0;padding-left:20px}nav li{margin:5px 0}a{color:#135b87;text-decoration-thickness:1px;text-underline-offset:3px}.case{padding:24px;margin:22px 0;scroll-margin-top:16px}.case-heading{display:flex;align-items:start;justify-content:space-between;gap:20px}pre{font:12px/1.55 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f7f9;border:1px solid #e3e9ee;border-radius:5px;padding:16px;max-height:640px;overflow:auto}.source{font:15px/1.6 system-ui,sans-serif;max-height:none;background:#f6f9fc}.table-scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:13px;text-align:left}th,td{padding:10px 12px;border-bottom:1px solid #e3e9ee;vertical-align:top;min-width:72px}th{font-size:11px;text-transform:uppercase;letter-spacing:.025em;color:#516476;background:#f5f7f9}td:first-child{min-width:220px;max-width:420px}td:last-child{min-width:190px;max-width:270px;overflow-wrap:anywhere;font-family:ui-monospace,monospace;font-size:11px}.issues{background:#fff5f3;border-left:3px solid #d85449;padding:1px 16px 12px;margin-top:20px}.issues li{overflow-wrap:anywhere;white-space:pre-wrap;font-size:13px}details{border-top:1px solid #e3e9ee;margin-top:20px;padding-top:14px}summary{cursor:pointer;color:#244f6d;font-size:13px;font-weight:650}.checks{list-style:none;padding:0}.checks li{margin:16px 0}.checks p{font-size:13px;overflow-wrap:anywhere}footer{color:#617282;font-size:12px;margin-top:30px}@media(max-width:700px){main{padding:24px 14px}.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.case{padding:16px}.case-heading{flex-direction:column;gap:8px}}@media print{body{background:white}main{padding:0;max-width:none}nav{display:none}.case{break-inside:avoid}.table-scroll{overflow:visible}pre{max-height:none}.cards{margin:16px 0}}
</style></head><body><main>
<p class="eyebrow">WorksRecorded / AI eval</p><h1>${escapeHtml(run.flow)}</h1>${badge(run.status)}
<p class="meta">${escapeHtml(run.runId)} · Sākums: ${escapeHtml(time)} (Europe/Riga)</p><p>${mode}</p>
${mediaNames.length ? `<details><summary>Lokāli saglabātie testa attēli (${mediaNames.length})</summary>${mediaNames.map((name) => `<a href="./media/${name}"><img src="./media/${name}" alt="Testa attēls" loading="lazy" style="max-width:360px;max-height:260px;margin:12px"></a>`).join("")}</details>` : ""}
<div class="cards"><div class="card"><b>${run.items.length}</b><span>Testu pieprasījumi</span></div><div class="card"><b>${passed}</b><span>Iziet</span></div><div class="card"><b>${failed}</b><span>Neiziet</span></div><div class="card"><b>${run.items.length - passed - failed}</b><span>Jāpārskata / nav novērtēts</span></div></div>
<nav aria-label="Testu saraksts"><ol>${run.items.map((item, index) => `<li><a href="#case-${index + 1}">${escapeHtml(item.label)}</a> ${badge(item.status)}</li>`).join("")}</ol></nav>
${run.items.map(renderCase).join("\n")}
<footer>Avots: ${escapeHtml(run.fileName)}. Atskaites apskatīšana neizsauc modeļus un neveido datubāzes ierakstus.</footer>
</main></body></html>\n`;
}
