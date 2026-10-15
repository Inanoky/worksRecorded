"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	addFimaRecord,
	copyFimaCommonFields,
	executeFimaBis,
	getFimaCaseResources,
	getFimaHistory,
	getFimaWorkspace,
	importFimaRows,
	inspectFimaBis,
	linkFimaBis,
	mergeFimaRows,
	refreshFimaBis,
	saveFimaRecord,
	saveFimaTemplate,
	searchFimaBisHistory,
	searchFimaKuceHistory,
} from "../backend/client";
import {
	canWrite,
	editUrl,
	type FimaRow,
	normalizeWork,
	type Proposal,
	parseMasts,
	readiness,
	spanLength,
} from "../lib/records";
import type { ImportRow } from "../lib/workbook";
import styles from "./fima-live.module.css";

const stages: Record<string, string> = {
	draft: "Sagatavojams",
	ready: "Pārbaudīts",
	hold: "Atlikts",
	recorded: "BIS ieraksts",
	executing: "Tiek saglabāts",
	unknown: "Jāpārbauda rezultāts",
	merged: "Apvienots",
};
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const label = (x: any) =>
	String(
		x.attributes?.material_kind ??
			x.attributes?.construction_name ??
			x.attributes?.name ??
			x.attributes?.title ??
			x.attributes?.person_full_name ??
			x.attributes?.name_with_role ??
			x.id,
	);
type Workspace = Awaited<ReturnType<typeof getFimaWorkspace>>;
export function FimaWorkspace({ siteId }: { siteId?: string }) {
	const [data, setData] = useState<Workspace | null>(null),
		[error, setError] = useState(""),
		[busy, setBusy] = useState(false);
	const [project, setProject] = useState(siteId ?? ""),
		[month, setMonth] = useState(""),
		[query, setQuery] = useState(""),
		[stage, setStage] = useState("");
	const [selection, setSelection] = useState<string[]>([]),
		[active, setActive] = useState<string | null>(null),
		[draft, setDraft] = useState<Proposal | null>(null);
	const [resources, setResources] = useState<any>(null),
		[resourceSite, setResourceSite] = useState(""),
		[history, setHistory] = useState<any[]>([]),
		[historyQuery, setHistoryQuery] = useState("");
	const [importRows, setImportRows] = useState<ImportRow[]>([]),
		[fileName, setFileName] = useState(""),
		[mode, setMode] = useState<"register" | "kuce">("register");
	const [results, setResults] = useState<string[]>([]),
		[batchKind, setBatchKind] = useState<"create" | "update" | "zero" | null>(
			null,
		),
		[acceptCreator, setAcceptCreator] = useState(false);
	const [bisLink, setBisLink] = useState(""),
		[templateText, setTemplateText] = useState(""),
		[audit, setAudit] = useState<any[]>([]),
		[importSite, setImportSite] = useState("");
	const [updateImport, setUpdateImport] = useState(false),
		[historySite, setHistorySite] = useState(""),
		[kuceHistory, setKuceHistory] = useState<FimaRow[]>([]);
	const [commonOpen, setCommonOpen] = useState(false),
		[useTemplates, setUseTemplates] = useState(true);
	const [reference, setReference] = useState<any>(null);
	const [importCase, setImportCase] = useState("");
	const pendingRows = importRows.filter(
		(r) => (r.caseName ?? "") === importCase,
	);
	const importCases = [...new Set(importRows.map((r) => r.caseName ?? ""))];
	const cancel = useRef(false);
	const mounted = useRef(true);
	const reload = useCallback(async () => {
		const value = await getFimaWorkspace(siteId);
		if (mounted.current) setData(value);
		return value;
	}, [siteId]);
	useEffect(() => {
		mounted.current = true;
		reload().catch((e) => setError(message(e)));
		return () => {
			mounted.current = false;
			cancel.current = true;
		};
	}, [reload]);
	const current = data?.records.find((r) => r.id === active);
	const visible = useMemo(
		() =>
			data?.records.filter(
				(r) =>
					(!project || r.siteId === project) &&
					(!month || r.proposal.date.startsWith(month)) &&
					(!stage || r.stage === stage) &&
					`${r.localId} ${r.proposal.sourceWork} ${r.proposal.description} ${r.proposal.rawMasts}`
						.toLocaleLowerCase()
						.includes(query.toLocaleLowerCase()),
			) ?? [],
		[data, project, month, stage, query],
	);
	const selected = data?.records.filter((r) => selection.includes(r.id)) ?? [];
	const act = async (fn: () => Promise<unknown>) => {
		setBusy(true);
		setError("");
		try {
			await fn();
		} catch (e) {
			setError(message(e));
		} finally {
			setBusy(false);
		}
	};
	const select = (r: FimaRow) => {
		if (
			active !== r.id &&
			current &&
			draft &&
			JSON.stringify(draft) !== JSON.stringify(current.proposal) &&
			!window.confirm("Nesaglabātās izmaiņas tiks atmestas. Turpināt?")
		)
			return;
		setActive(r.id);
		setDraft(structuredClone(r.proposal));
		setAudit([]);
		setHistory([]);
		setKuceHistory([]);
		setHistorySite(r.siteId);
		setBisLink("");
		setTemplateText("");
		setReference(null);
	};
	const change = (key: keyof Proposal, value: any) =>
		setDraft((p) =>
			p
				? {
						...p,
						[key]: value,
						...(key !== "reviewed" ? { reviewed: false } : {}),
					}
				: p,
		);
	const loadResources = async () => {
		if (!current) return;
		const value = await getFimaCaseResources(current.siteId);
		setResources(value);
		setResourceSite(current.siteId);
	};
	const save = async (status: "draft" | "ready" | "hold") => {
		if (!current || !draft) return;
		await saveFimaRecord(current.id, current.version, draft, status);
		const next = await reload();
		const r = next.records.find((r) => r.id === active);
		if (r) select(r);
	};
	const importFile = async (file: File) => {
		if (file.size > 10 * 1024 * 1024)
			throw new Error("Faila izmēra ierobežojums ir 10 MB");
		const { parseWorkbook } = await import("../lib/workbook");
		const rows = parseWorkbook(
			await file.arrayBuffer(),
			file.name,
			month,
			mode,
		);
		setImportRows(rows);
		setImportCase(rows[0]?.caseName ?? "");
		setFileName(file.name);
		setImportSite(project);
	};
	const runBatch = async (kind: "create" | "update" | "zero") => {
		const targets = [...selected];
		setBatchKind(null);
		setResults([]);
		cancel.current = false;
		for (const r of targets) {
			if (cancel.current) break;
			try {
				await executeFimaBis(r.id, r.version, kind, acceptCreator);
				setResults((x) => [...x, `${r.localId}: saglabāts un pārbaudīts`]);
			} catch (e) {
				setResults((x) => [...x, `${r.localId}: ${message(e)}`]);
			}
		}
		setSelection([]);
		await reload();
	};
	const syncSelected = async () => {
		setResults([]);
		for (const r of selected) {
			try {
				await refreshFimaBis(r.id);
				setResults((x) => [...x, `${r.localId}: statuss atjaunots`]);
			} catch (e) {
				setResults((x) => [...x, `${r.localId}: ${message(e)}`]);
			}
		}
		await reload();
	};
	const eligible = (r: FimaRow, kind: string) =>
		kind === "create"
			? !r.bisId && r.stage === "ready" && r.proposal.authorMode === "api"
			: Boolean(
					r.bisId &&
						r.managed &&
						r.bisStatus === "draft" &&
						!["unknown", "executing"].includes(r.stage) &&
						(kind !== "update" || r.stage === "ready"),
				);
	if (!data)
		return (
			<section className={styles.app}>
				<h1>FIMA · BIS darbu uzskaite</h1>
				<output>{error || "Ielādē reģistru…"}</output>
				{error && (
					<button type="button" onClick={() => act(reload)}>
						Mēģināt vēlreiz
					</button>
				)}
			</section>
		);
	const caseSite = data.sites.find((s) => s.id === current?.siteId);
	const catalog =
		resources && resourceSite === current?.siteId ? resources : null;
	const protectedRow = Boolean(
		current &&
			(!canWrite(current) ||
				["executing", "unknown", "merged"].includes(current.stage)),
	);
	return (
		<section className={styles.app}>
			<header className={styles.header}>
				<div>
					<img
						src="/logos/fima-official.png"
						alt="FIMA"
						width={100}
						height={31}
					/>
					<h1>BIS darbu uzskaite</h1>
					<p>
						KUCE atskaite, pārbaudīts priekšlikums un BIS rezultāts vienā
						reģistrā.
					</p>
				</div>
				<div className={styles.actions}>
					<button type="button" disabled={busy} onClick={() => act(reload)}>
						Atjaunot pārskatu
					</button>
					<a href="/dashboard/sites/new">Pievienot projektu</a>
					{project && (
						<a href={`/dashboard/sites/${project}/settings`}>
							BIS savienojums un projekta iestatījumi
						</a>
					)}
					<button
						type="button"
						disabled={!visible.length}
						onClick={() =>
							act(async () => {
								const [XLSX, { exportWorkbook }] = await Promise.all([
									import("xlsx"),
									import("../lib/workbook"),
								]);
								XLSX.writeFile(
									exportWorkbook(
										visible,
										Object.fromEntries(data.sites.map((s) => [s.id, s.name])),
										data.bisBase,
									),
									`FIMA-${month || "registrs"}.xlsx`,
								);
							})
						}
					>
						Eksportēt Excel
					</button>
					<button
						type="button"
						className={styles.primary}
						disabled={busy || !project}
						onClick={() =>
							act(async () => {
								const id = await addFimaRecord(project);
								const next = await reload();
								select(next.records.find((r) => r.id === id)!);
							})
						}
					>
						Jauns priekšlikums
					</button>
				</div>
			</header>
			{error && (
				<div role="alert" className={styles.error}>
					{error}
				</div>
			)}
			{data.truncated && (
				<p role="alert">
					Parādīti pirmie 5000 ieraksti. Atveriet konkrēta projekta pārskatu.
				</p>
			)}
			<div className={styles.stats}>
				<span>
					<strong>
						{data.records.filter((r) => r.stage === "draft").length}
					</strong>{" "}
					Sagatavojami
				</span>
				<span>
					<strong>
						{data.records.filter((r) => r.stage === "ready").length}
					</strong>{" "}
					Pārbaudīti
				</span>
				<span>
					<strong>{data.records.filter((r) => r.bisId).length}</strong> Ar BIS
					saiti
				</span>
				<span>
					<strong>
						{data.records.filter((r) => r.stage === "unknown").length}
					</strong>{" "}
					Jāpārbauda rezultāts
				</span>
			</div>
			<div className={styles.filters}>
				<label>
					Projekts
					<select
						value={project}
						onChange={(e) => {
							setProject(e.target.value);
							setSelection([]);
						}}
						disabled={Boolean(siteId)}
					>
						<option value="">Visi projekti</option>
						{data.sites.map((s) => (
							<option value={s.id} key={s.id}>
								{s.name}
							</option>
						))}
					</select>
				</label>
				<label>
					Mēnesis
					<input
						type="month"
						value={month}
						onChange={(e) => {
							setMonth(e.target.value);
							setSelection([]);
						}}
					/>
				</label>
				<label>
					Statuss
					<select
						value={stage}
						onChange={(e) => {
							setStage(e.target.value);
							setSelection([]);
						}}
					>
						<option value="">Visi statusi</option>
						{Object.entries(stages).map(([v, l]) => (
							<option key={v} value={v}>
								{l}
							</option>
						))}
					</select>
				</label>
				<label>
					Meklēt
					<input
						value={query}
						placeholder="ID, darbs vai balsts"
						onChange={(e) => {
							setQuery(e.target.value);
							setSelection([]);
						}}
					/>
				</label>
			</div>
			<details className={styles.import}>
				<summary>Importēt KUCE atskaiti vai sagatavoto Excel reģistru</summary>
				<p>
					Oriģinālās rindas tiek saglabātas ar faila, lapas un šūnas norādi.
					Importēti BIS ieraksti ir tikai lasāmi līdz atsevišķai pārbaudei.
				</p>
				<div className={styles.actions}>
					<select
						aria-label="Importa veids"
						value={mode}
						onChange={(e) => setMode(e.target.value as typeof mode)}
					>
						<option value="register">FIMA Excel reģistrs</option>
						<option value="kuce">KUCE brigāžu atskaite (C/J/Q/X)</option>
					</select>
					<input
						aria-label="Excel fails"
						type="file"
						accept=".xlsx,.xls"
						disabled={busy}
						onChange={(e) => {
							const f = e.target.files?.[0];
							if (f) void act(() => importFile(f));
							e.target.value = "";
						}}
					/>
				</div>
				{importRows.length > 0 && (
					<div>
						<h3>
							{fileName} · {importRows.length} rindas
						</h3>
						<label>
							Avota BIS lieta ({pendingRows.length} rindas)
							<select
								value={importCase}
								onChange={(e) => {
									setImportCase(e.target.value);
									setImportSite("");
								}}
							>
								{importCases.map((c) => (
									<option key={c} value={c}>
										{c || "Avotā lieta nav norādīta"}
									</option>
								))}
							</select>
						</label>
						<label>
							Piesaistīt projektam
							<select
								value={importSite}
								onChange={(e) => setImportSite(e.target.value)}
							>
								<option value="">Izvēlieties projektu</option>
								{data.sites.map((s) => (
									<option key={s.id} value={s.id}>
										{s.name}
									</option>
								))}
							</select>
						</label>
						<div className={styles.preview}>
							<table>
								<thead>
									<tr>
										<th>Avots</th>
										<th>Datums</th>
										<th>KUCE darbs</th>
										<th>Balsti</th>
										<th>Maiņa / cilvēki</th>
										<th>Pārbaude</th>
									</tr>
								</thead>
								<tbody>
									{pendingRows.slice(0, 50).map((r) => (
										<tr key={`${r.sources[0].sheet}:${r.sources[0].cell}`}>
											<td>
												{r.sources[0].sheet}!{r.sources[0].cell}
											</td>
											<td>{r.proposal.date}</td>
											<td>{r.proposal.sourceWork}</td>
											<td>{r.proposal.rawMasts}</td>
											<td>
												{r.proposal.start}–{r.proposal.end} /{" "}
												{r.proposal.workers ?? "?"}
											</td>
											<td>{r.warning}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<p>
							Priekšskatījumā pirmās 50 rindas. Pirms BIS izveides katrs
							priekšlikums jāpārbauda.
						</p>
						<label>
							<input
								type="checkbox"
								checked={updateImport}
								onChange={(e) => setUpdateImport(e.target.checked)}
							/>{" "}
							Importēt esošo priekšlikumu labojumus, ja ID un eksportētā versija
							sakrīt. Oriģinālie avoti, materiālu piesaistes un BIS saites
							saglabājas.
						</label>
						<button
							type="button"
							className={styles.primary}
							disabled={busy || !importSite}
							onClick={() =>
								act(async () => {
									if (
										new TextEncoder().encode(JSON.stringify(pendingRows))
											.length > 900000
									)
										throw new Error(
											"Vienā importā pārāk daudz datu. Sadaliet atskaiti pa projektiem vai dienām.",
										);
									const result = await importFimaRows(
										importSite,
										fileName,
										pendingRows,
										updateImport,
									);
									setResults([
										result.duplicate
											? "Šis imports jau saglabāts."
											: `Importētas ${result.count} rindas.`,
									]);
									setImportRows(
										importRows.filter((r) => !pendingRows.includes(r)),
									);
									setImportCase(
										importRows.find((r) => !pendingRows.includes(r))
											?.caseName ?? "",
									);
									setImportSite("");
									await reload();
								})
							}
						>
							Saglabāt importu
						</button>
					</div>
				)}
			</details>
			{selection.length > 0 && (
				<div className={styles.bulk}>
					<strong>Izvēlēts: {selection.length}</strong>
					<button
						type="button"
						disabled={busy}
						onClick={() => act(syncSelected)}
					>
						Pārbaudīt BIS
					</button>
					{(
						[
							["create", "Izveidot API sagataves"],
							["update", "Atjaunot API sagataves"],
							["zero", "Materiālus uz 0"],
						] as const
					).map(([kind, title]) => (
						<button
							type="button"
							key={kind}
							disabled={busy || selected.some((r) => !eligible(r, kind))}
							onClick={() => {
								setBatchKind(kind);
								setAcceptCreator(false);
							}}
						>
							{title}
						</button>
					))}
					<button
						type="button"
						disabled={
							busy || selected.length < 2 || selected.some((r) => r.bisId)
						}
						onClick={() =>
							act(async () => {
								const id = await mergeFimaRows(selection, null);
								setSelection([]);
								const n = await reload();
								select(n.records.find((r) => r.id === id)!);
							})
						}
					>
						Apvienot brigādes
					</button>
					<button type="button" onClick={() => setSelection([])}>
						Noņemt atlasi
					</button>
				</div>
			)}
			{selection.length > 0 && current && (
				<button
					type="button"
					disabled={
						busy ||
						selected.some((r) => r.siteId !== current.siteId || !canWrite(r))
					}
					onClick={() => setCommonOpen(true)}
				>
					Kopēt kopīgos BIS laukus no {current.localId}
				</button>
			)}
			{commonOpen && current && (
				<dialog
					open
					aria-label="Kopīgo BIS lauku pārskats"
					className={styles.confirm}
				>
					<h2>Kopīgie BIS lauki no {current.localId}</h2>
					<p>
						Izvēlētajās {selected.length} rindās aizstās atbildīgo personu,
						būvniecības objektus un rasējumu saites ar šīs rindas saglabātajām
						vērtībām. Pēc tam pārbaudiet katra balsta rasējumu un atzīmējiet
						rindu pārbaudītu.
					</p>
					<label>
						<input
							type="checkbox"
							checked={useTemplates}
							onChange={(e) => setUseTemplates(e.target.checked)}
						/>{" "}
						Aizpildīt tukšos darbu aprakstus ar saglabāto tāda paša KUCE darba
						veidni
					</label>
					<button
						type="button"
						disabled={busy}
						onClick={() =>
							act(async () => {
								const count = await copyFimaCommonFields(
									current.id,
									selected.map((r) => ({ id: r.id, version: r.version })),
									useTemplates,
								);
								setCommonOpen(false);
								setSelection([]);
								const next = await reload();
								const r = next.records.find((r) => r.id === active);
								if (r) select(r);
								setResults([
									`Kopīgie lauki sagatavoti ${count} rindās. Pārbaudiet rasējumu atbilstību balstiem.`,
								]);
							})
						}
					>
						Piemērot izvēlētajām rindām
					</button>
					<button type="button" onClick={() => setCommonOpen(false)}>
						Atcelt
					</button>
				</dialog>
			)}
			{batchKind && (
				<dialog
					open
					aria-label="BIS darbības pārskats"
					className={styles.confirm}
				>
					<h2>
						{batchKind === "zero"
							? "Materiālu daudzumi → 0"
							: "Pārbaudiet izvēlētās BIS sagataves"}
					</h2>
					<p>
						{batchKind === "zero"
							? "Darbu apjoms, maiņa un darbinieku skaits paliks nemainīgi."
							: "Tiks saglabāts tieši pārbaudītais apraksts. Ieraksti netiks nosūtīti apstiprināšanai."}
					</p>
					<ul>
						{selected.map((r) => (
							<li key={r.id}>
								{r.localId} · {r.proposal.date} · {r.proposal.rawMasts} ·{" "}
								{r.proposal.quantity} {r.proposal.unit}
							</li>
						))}
					</ul>
					{batchKind === "create" && (
						<label>
							<input
								type="checkbox"
								checked={acceptCreator}
								onChange={(e) => setAcceptCreator(e.target.checked)}
							/>{" "}
							Piekrītu API izveidei: BIS autora laukā var parādīties “Publisko
							saskarņu lietotājs”, nevis mans vārds.
						</label>
					)}
					<div className={styles.actions}>
						<button
							type="button"
							disabled={busy || (batchKind === "create" && !acceptCreator)}
							className={styles.primary}
							onClick={() => act(() => runBatch(batchKind))}
						>
							Izpildīt {selected.length} ierakstiem
						</button>
						<button type="button" onClick={() => setBatchKind(null)}>
							Atcelt
						</button>
					</div>
				</dialog>
			)}
			{busy && (
				<output>
					Notiek apstrāde…{" "}
					<button
						type="button"
						onClick={() => {
							cancel.current = true;
						}}
					>
						Apturēt pēc pašreizējā ieraksta
					</button>
				</output>
			)}
			{results.length > 0 && (
				<details open className={styles.results}>
					<summary>Darbību rezultāti</summary>
					{results.map((r) => (
						<p key={r}>{r}</p>
					))}
				</details>
			)}
			<div className={styles.workspace}>
				<div className={styles.tableWrap}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>
									<input
										aria-label="Atlasīt redzamās rindas"
										type="checkbox"
										checked={
											visible.length > 0 &&
											visible.every((r) => selection.includes(r.id))
										}
										onChange={(e) =>
											setSelection(
												e.target.checked ? visible.map((r) => r.id) : [],
											)
										}
									/>
								</th>
								<th>ID / datums</th>
								<th>Statuss / BIS</th>
								<th>KUCE oriģināls</th>
								<th>BIS priekšlikums</th>
								<th>Balsti / apjoms</th>
							</tr>
						</thead>
						<tbody>
							{visible.map((r) => (
								<tr
									key={r.id}
									data-selected={active === r.id}
									onClick={() => select(r)}
								>
									<td>
										<input
											aria-label={`Atlasīt ${r.localId}`}
											type="checkbox"
											checked={selection.includes(r.id)}
											onClick={(e) => e.stopPropagation()}
											onChange={(e) =>
												setSelection((x) =>
													e.target.checked
														? [...x, r.id]
														: x.filter((id) => id !== r.id),
												)
											}
										/>
									</td>
									<td>
										<button
											type="button"
											className={styles.rowButton}
											onClick={() => select(r)}
										>
											{r.localId}
										</button>
										<small>{r.proposal.date}</small>
									</td>
									<td>
										<span className={styles.badge} data-stage={r.stage}>
											{stages[r.stage] ?? r.stage}
										</span>
										{r.bisId && (
											<a
												href={editUrl(r.bisId, data.bisBase)}
												target="_blank"
												rel="noreferrer"
												onClick={(e) => e.stopPropagation()}
											>
												BIS {r.snapshot?.reference?.doc_number ?? r.bisId} ↗
											</a>
										)}
										<small>{r.bisStatus}</small>
									</td>
									<td>{r.proposal.sourceWork}</td>
									<td>
										{r.proposal.description || (
											<em>Priekšlikums vēl nav sagatavots</em>
										)}
									</td>
									<td>
										{r.proposal.rawMasts}
										<small>
											{r.proposal.quantity ?? "?"} {r.proposal.unit}
										</small>
									</td>
								</tr>
							))}
							{!visible.length && (
								<tr>
									<td colSpan={6}>
										<p>
											Nav ierakstu. Izvēlieties projektu un importējiet KUCE
											atskaiti vai pievienojiet priekšlikumu.
										</p>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
				{current && draft && (
					<aside className={styles.editor}>
						<div className={styles.editorHeading}>
							<h2>{current.localId}</h2>
							<button
								type="button"
								aria-label="Aizvērt detaļas"
								onClick={() => setActive(null)}
							>
								×
							</button>
						</div>
						<p>
							{caseSite?.name} ·{" "}
							{caseSite?.bisCaseName ?? "BIS lieta nav piesaistīta"}
						</p>
						<a href={`/dashboard/sites/${current.siteId}/settings`}>
							Projekta un BIS iestatījumi ↗
						</a>
						{protectedRow && (
							<p className={styles.notice}>
								Šī rinda ir aizsargāta. Esošus ārējos un apstiprināšanai nodotos
								BIS ierakstus šeit nemaina.
							</p>
						)}
						<fieldset disabled={busy || protectedRow}>
							<legend>Darba priekšlikums</legend>
							<label>
								KUCE oriģinālais darbs
								<textarea
									value={draft.sourceWork}
									readOnly={current.sources.length > 0}
									onChange={(e) => change("sourceWork", e.target.value)}
								/>
							</label>
							<label>
								BIS darbu apraksts
								<textarea
									rows={5}
									value={draft.description}
									onChange={(e) => change("description", e.target.value)}
								/>
							</label>
							<label>
								Apstiprināta darba veidne
								<select
									defaultValue=""
									onChange={(e) => {
										const t = data.templates.find(
											(t: any) => t.id === e.target.value,
										);
										if (t)
											setDraft({
												...draft,
												description: t.description
													.replaceAll("{masts}", draft.masts.join(", "))
													.replaceAll("{date}", draft.date),
												evidence: [...draft.evidence, ...t.evidence],
												reviewed: false,
											});
									}}
								>
									<option value="">
										Izvēlieties atbilstošu vēsturisko darbu
									</option>
									{data.templates
										.filter(
											(t: any) =>
												normalizeWork(t.sourceWork) ===
												normalizeWork(draft.sourceWork),
										)
										.map((t: any) => (
											<option key={t.id} value={t.id}>
												{t.sourceWork}
											</option>
										))}
								</select>
							</label>
							<div className={styles.two}>
								<label>
									Darbu datums
									<input
										type="date"
										value={draft.date}
										onChange={(e) => change("date", e.target.value)}
									/>
								</label>
								<label>
									Darbinieki
									<input
										type="number"
										min="0"
										step="1"
										value={draft.workers ?? ""}
										onChange={(e) =>
											change(
												"workers",
												e.target.value === "" ? null : Number(e.target.value),
											)
										}
									/>
								</label>
								<label>
									Maiņas sākums
									<input
										type="time"
										value={draft.start}
										onChange={(e) => change("start", e.target.value)}
									/>
								</label>
								<label>
									Maiņas beigas
									<input
										type="time"
										value={draft.end}
										onChange={(e) => change("end", e.target.value)}
									/>
								</label>
							</div>
							<label>
								Balsti / posms
								<input
									value={draft.rawMasts}
									onChange={(e) =>
										setDraft({
											...draft,
											rawMasts: e.target.value,
											masts: parseMasts(e.target.value),
											reviewed: false,
										})
									}
								/>
							</label>
							<small>
								{"//"} un balstu numuru atšķirības pārbaudiet avotā; tās netiek
								automātiski labotas.
							</small>
							<div className={styles.two}>
								<label>
									Darbu apjoms
									<input
										type="number"
										step="any"
										min="0"
										value={draft.quantity ?? ""}
										onChange={(e) =>
											change(
												"quantity",
												e.target.value === "" ? null : Number(e.target.value),
											)
										}
									/>
								</label>
								<label>
									Mērvienība
									<select
										value={draft.measurement}
										onChange={(e) => {
											const x = catalog?.measures.find(
												(x: any) =>
													String(x.attributes.code ?? x.id) === e.target.value,
											);
											setDraft({
												...draft,
												measurement: e.target.value,
												unit: x?.attributes?.name ?? draft.unit,
												reviewed: false,
											});
										}}
									>
										<option value="">Izvēlieties</option>
										{!catalog && draft.measurement && (
											<option value={draft.measurement}>{draft.unit}</option>
										)}
										{catalog?.measures.map((x: any) => (
											<option key={x.id} value={x.attributes.code ?? x.id}>
												{x.attributes.name}
											</option>
										))}
									</select>
								</label>
							</div>
							<button type="button" onClick={() => act(loadResources)}>
								Ielādēt BIS personas, objektus, materiālus un rasējumus
							</button>
							{catalog?.errors?.map((e: string) => (
								<p className={styles.notice} key={e}>
									{e}
								</p>
							))}
							<label>
								Atbildīgā persona
								<select
									value={`${draft.responsibleId}:${draft.responsibleType}`}
									onChange={(e) => {
										const [responsibleId, responsibleType] =
											e.target.value.split(":");
										setDraft({
											...draft,
											responsibleId,
											responsibleType,
											reviewed: false,
										});
									}}
								>
									<option value=":">Izvēlieties</option>
									{catalog?.available_responsible_persons.map((x: any) => (
										<option
											key={`${x.attributes.responsible_person_id}:${x.attributes.responsible_person_type}`}
											value={`${x.attributes.responsible_person_id}:${x.attributes.responsible_person_type}`}
										>
											{label(x)}
										</option>
									))}
								</select>
							</label>
							<label>
								Būvniecības objekti
								<select
									multiple
									value={draft.buildingIds}
									onChange={(e) =>
										change(
											"buildingIds",
											Array.from(e.target.selectedOptions, (o) => o.value),
										)
									}
								>
									{catalog?.case_buildings.map((x: any) => (
										<option key={x.id} value={x.id}>
											{label(x)}
										</option>
									))}
								</select>
							</label>
							<details>
								<summary>Rasējumi ({draft.drawings.length})</summary>
								<select
									aria-label="Pievienot rasējumu"
									value=""
									onChange={(e) => {
										const x = catalog.project.find(
											(x: any) => String(x.id) === e.target.value,
										);
										if (x && !draft.drawings.some((d) => d.id === String(x.id)))
											change("drawings", [
												...draft.drawings,
												{
													id: String(x.id),
													title: label(x),
													sheet: String(x.attributes.original_number ?? ""),
													revision: String(x.attributes.revision ?? ""),
												},
											]);
									}}
								>
									<option value="">Pievienot rasējumu</option>
									{catalog?.project.map((x: any) => (
										<option key={x.id} value={x.id}>
											{x.attributes.original_number} · {label(x)} ·{" "}
											{x.attributes.revision}
										</option>
									))}
								</select>
								{draft.drawings.map((d, i) => (
									<div key={d.id}>
										<p>
											{d.title} · {d.sheet} · rev. {d.revision}
										</p>
										<button
											type="button"
											onClick={() =>
												change(
													"drawings",
													draft.drawings.filter((_, j) => j !== i),
												)
											}
										>
											Noņemt saiti
										</button>
									</div>
								))}
							</details>
							<details>
								<summary>Materiāli ({draft.materials.length})</summary>
								{draft.materialSource && (
									<p>Excel avots: {draft.materialSource}</p>
								)}
								<p>Šeit maina materiālu daudzumu, nevis darbu apjomu.</p>
								<select
									aria-label="Pievienot materiālu"
									value=""
									onChange={(e) => {
										const x = catalog.available_used_materials.find(
											(x: any) => String(x.id) === e.target.value,
										);
										const id = String(
											x?.attributes?.construction_material_id ?? x?.id ?? "",
										);
										if (x && !draft.materials.some((m) => m.id === id))
											change("materials", [
												...draft.materials,
												{
													id,
													name: label(x),
													unit: String(
														catalog.measures.find(
															(m: any) =>
																String(m.attributes.code) ===
																String(x.attributes.measurement),
														)?.attributes.name ??
															x.attributes.measurement_name ??
															x.attributes.measurement ??
															"",
													),
													quantity: 0,
													plannedQuantity: null,
												},
											]);
									}}
								>
									<option value="">Pievienot no šīs BIS lietas</option>
									{catalog?.available_used_materials.map((x: any) => (
										<option key={x.id} value={x.id}>
											{label(x)}
										</option>
									))}
								</select>
								{draft.materials.map((m, i) => (
									<label key={m.id}>
										{m.name} ({m.unit})
										<input
											aria-label={`${m.name} daudzums`}
											type="number"
											step="any"
											min="0"
											value={m.quantity}
											onChange={(e) =>
												change(
													"materials",
													draft.materials.map((m, j) =>
														i === j
															? { ...m, quantity: Number(e.target.value) }
															: m,
													),
												)
											}
										/>
										<button
											type="button"
											onClick={() =>
												change(
													"materials",
													draft.materials.filter((_, j) => i !== j),
												)
											}
										>
											Noņemt no priekšlikuma
										</button>
									</label>
								))}
							</details>
							<details>
								<summary>Garuma aprēķins pēc laidumiem</summary>
								{draft.spans.map((s, i) => (
									<div
										className={styles.span}
										key={s.id ?? `${s.from}:${s.to}:${s.drawing}`}
									>
										{(
											[
												["from", "No balsta"],
												["to", "Līdz balstam"],
												["metres", "Metri"],
												["drawing", "Rasējums / lapa / rev."],
											] as const
										).map(([k, l]) => (
											<label key={k}>
												{l}
												<input
													value={s[k]}
													type={k === "metres" ? "number" : "text"}
													step="any"
													onChange={(e) =>
														change(
															"spans",
															draft.spans.map((s, j) =>
																i === j
																	? {
																			...s,
																			[k]:
																				k === "metres"
																					? Number(e.target.value)
																					: e.target.value,
																		}
																	: s,
															),
														)
													}
												/>
											</label>
										))}
										<button
											type="button"
											onClick={() =>
												change(
													"spans",
													draft.spans.filter((_, j) => j !== i),
												)
											}
										>
											Noņemt laidumu
										</button>
									</div>
								))}
								<div className={styles.actions}>
									<button
										type="button"
										onClick={() =>
											change("spans", [
												...draft.spans,
												{
													from: draft.spans.at(-1)?.to ?? "",
													to: "",
													metres: 0,
													id: crypto.randomUUID(),
													drawing: "",
												},
											])
										}
									>
										Pievienot laidumu
									</button>
									<button
										type="button"
										onClick={() =>
											act(async () =>
												setDraft({
													...draft,
													quantity: spanLength(draft.spans),
													measurement: "29",
													unit: "m",
													reviewed: false,
												}),
											)
										}
									>
										Aprēķināt metrus
									</button>
								</div>
							</details>
							<label>
								Iekšējās piezīmes (netiek sūtītas BIS)
								<textarea
									value={draft.notes}
									onChange={(e) => change("notes", e.target.value)}
								/>
							</label>
							<label>
								Izveides veids
								<select
									value={draft.authorMode}
									onChange={(e) => change("authorMode", e.target.value)}
								>
									<option value="browser">No mana profila BIS pārlūkā</option>
									<option value="api">API — BIS sistēmas lietotājs</option>
								</select>
							</label>
							<label className={styles.check}>
								<input
									type="checkbox"
									checked={draft.reviewed}
									onChange={(e) => change("reviewed", e.target.checked)}
								/>{" "}
								Pārbaudīts apraksts, balsti, daudzumi, maiņa un avoti
							</label>
							<div className={styles.actions}>
								<button type="button" onClick={() => act(() => save("draft"))}>
									Saglabāt priekšlikumu
								</button>
								<button
									type="button"
									className={styles.primary}
									onClick={() => act(() => save("ready"))}
								>
									Atzīmēt pārbaudītu
								</button>
								<button type="button" onClick={() => act(() => save("hold"))}>
									Atlikt
								</button>
							</div>
							{readiness(draft).length > 0 && (
								<ul className={styles.validation}>
									{readiness(draft).map((e) => (
										<li key={e}>{e}</li>
									))}
								</ul>
							)}
						</fieldset>
						<details>
							<summary>Salīdzinošie KUCE / BIS ieraksti</summary>
							<div className={styles.actions}>
								<input
									aria-label="Vēsturiskā darba meklēšana"
									value={historyQuery}
									onChange={(e) => setHistoryQuery(e.target.value)}
									placeholder="Darba nosaukums vai balsts"
								/>
								<button
									type="button"
									disabled={busy}
									onClick={() =>
										act(async () =>
											setKuceHistory(await searchFimaKuceHistory(historyQuery)),
										)
									}
								>
									Meklēt KUCE arhīvā
								</button>
								<select
									aria-label="Vēsturiskā BIS projekta izvēle"
									value={historySite}
									onChange={(e) => setHistorySite(e.target.value)}
								>
									{data.sites.map((s) => (
										<option key={s.id} value={s.id}>
											{s.name}
										</option>
									))}
								</select>
								<button
									type="button"
									disabled={busy || !historySite}
									onClick={() =>
										act(async () =>
											setHistory(
												await searchFimaBisHistory(historySite, historyQuery),
											),
										)
									}
								>
									Meklēt BIS
								</button>
							</div>
							{kuceHistory.map((r) => (
								<div className={styles.reference} key={r.id}>
									<strong>
										{r.localId} · {r.proposal.date} · {r.proposal.sourceWork}
									</strong>
									<p>
										{r.proposal.rawMasts} · {r.proposal.description}
									</p>
									<small>
										{r.sources
											.map((s) => `${s.file} ${s.sheet}!${s.cell}`)
											.join("; ")}
									</small>
									{r.bisId && (
										<a
											href={editUrl(r.bisId, data.bisBase)}
											target="_blank"
											rel="noreferrer"
										>
											BIS ieraksts ↗
										</a>
									)}
									<button
										type="button"
										disabled={protectedRow}
										onClick={() =>
											change("evidence", [
												...draft.evidence,
												{
													title: `KUCE ${r.localId}: ${r.proposal.sourceWork}`,
													url: r.bisId ? editUrl(r.bisId, data.bisBase) : "",
													detail: `${r.proposal.rawMasts}; ${r.sources.map((s) => `${s.file} ${s.sheet}!${s.cell}`).join("; ")}`,
												},
											])
										}
									>
										Pievienot avotu
									</button>
								</div>
							))}
							{history.map((h) => (
								<div className={styles.reference} key={h.id}>
									<a
										target="_blank"
										rel="noreferrer"
										href={editUrl(h.id, data.bisBase)}
									>
										Nr.{h.doc_number} · {h.event_date}
									</a>
									<p>{h.description}</p>
									<button
										type="button"
										disabled={busy}
										onClick={() =>
											act(async () =>
												setReference(await inspectFimaBis(historySite, h.id)),
											)
										}
									>
										Apskatīt materiālus un apjomu
									</button>
									<button
										type="button"
										disabled={protectedRow}
										onClick={() =>
											change("evidence", [
												...draft.evidence,
												{
													title: `BIS Nr.${h.doc_number}`,
													url: editUrl(h.id, data.bisBase),
													detail: h.description,
												},
											])
										}
									>
										Pievienot kā salīdzinājumu
									</button>
								</div>
							))}
							{reference && (
								<div className={styles.reference}>
									<h3>BIS Nr. {reference.reference.doc_number}</h3>
									<p>{reference.reference.description}</p>
									<p>
										{reference.reference.detail?.quantity?.combined} ·{" "}
										{reference.reference.detail?.employees} darbinieki
									</p>
									<p>Izveidoja: {reference.reference.created_by?.full_name}</p>
									<h4>Materiāli</h4>
									{reference.reference.used_construction_materials?.map(
										(m: any) => (
											<p key={typeof m === "string" ? m : m.id}>
												{typeof m === "string" ? m : m.name}
											</p>
										),
									)}
									{!reference.materials.length && (
										<p>Materiāli nav norādīti.</p>
									)}
									<h4>Rasējumi</h4>
									{reference.reference.project_documents?.map((d: any) => (
										<p key={d.id}>{d.title}</p>
									))}
								</div>
							)}
							{draft.evidence.map((e) => (
								<p key={`${e.title}:${e.url}`}>
									{e.url ? (
										<a href={e.url} target="_blank" rel="noreferrer">
											{e.title}
										</a>
									) : (
										e.title
									)}
									<small>{e.detail}</small>
								</p>
							))}
							<label>
								Veidnes BIS apraksts ({"{masts}"} = balsti, {"{date}"} = datums)
								<textarea
									value={templateText}
									onChange={(e) => setTemplateText(e.target.value)}
								/>
							</label>
							<button
								type="button"
								disabled={busy || !templateText || protectedRow}
								onClick={() =>
									act(async () => {
										await save("draft");
										await saveFimaTemplate(current.id, templateText);
										await reload();
										setResults(["Pārbaudītā veidne saglabāta."]);
									})
								}
							>
								Saglabāt darba veidni
							</button>
						</details>
						<details>
							<summary>Oriģinālie avoti</summary>
							{current.sources.map((s) => (
								<p key={`${s.file}:${s.sheet}:${s.cell}`}>
									<strong>
										{s.file} · {s.sheet}!{s.cell}
									</strong>
									<small>{s.raw}</small>
								</p>
							))}
						</details>
						<details>
							<summary>Izmaiņu vēsture</summary>
							<button
								type="button"
								onClick={() =>
									act(async () => setAudit(await getFimaHistory(current.id)))
								}
							>
								Ielādēt vēsturi
							</button>
							{audit.map((a) => (
								<p key={a.id}>
									{a.createdAt} · {a.action} · v{a.version}
									<small>{a.actorId}</small>
								</p>
							))}
						</details>
						{draft.authorMode === "browser" && !current.bisId && (
							<div className={styles.notice}>
								<h3>Izveide no sava BIS profila</h3>
								<p>
									Saglabājiet pārbaudīto priekšlikumu, atveriet BIS un
									izveidojiet sagatavi. Pēc tam piesaistiet ierakstu pārbaudei.
								</p>
								<button
									type="button"
									disabled={current.stage !== "ready"}
									onClick={() =>
										act(async () => {
											await navigator.clipboard.writeText(
												[
													`Darbu apraksts: ${current.proposal.description}`,
													`Datums: ${current.proposal.date}`,
													`Maiņa: ${current.proposal.start}–${current.proposal.end}`,
													`Darbu apjoms: ${current.proposal.quantity} ${current.proposal.unit}`,
													`Darbinieki: ${current.proposal.workers}`,
													`Materiāli:\n${current.proposal.materials.map((m) => `${m.name}: ${m.quantity} ${m.unit}`).join("\n")}`,
													`Rasējumi:\n${current.proposal.drawings.map((d) => `${d.title} / ${d.sheet} / ${d.revision}`).join("\n")}`,
												].join("\n\n"),
											);
											setResults(["Pārbaudītie lauki nokopēti."]);
										})
									}
								>
									Kopēt pārbaudītos laukus
								</button>
								{caseSite?.bisCaseId && (
									<a
										href={`${data.bisBase}/bisp/lv/portal/logbooks/performed_works/new?bis_case_id=${caseSite.bisCaseId}`}
										target="_blank"
										rel="noreferrer"
									>
										Atvērt jaunu BIS sagatavi ↗
									</a>
								)}
							</div>
						)}
						{!current.bisId && (
							<label>
								BIS ieraksta saite vai ID
								<input
									value={bisLink}
									onChange={(e) => setBisLink(e.target.value)}
								/>
								<button
									type="button"
									disabled={busy || !bisLink}
									onClick={() =>
										act(async () => {
											const id =
												bisLink.match(/performed_works\/(\d+)/)?.[1] ?? bisLink;
											await linkFimaBis(current.id, current.version, id);
											await reload();
										})
									}
								>
									Pārbaudīt un piesaistīt
								</button>
							</label>
						)}
						{!current.bisId &&
							["executing", "unknown"].includes(current.stage) && (
								<button
									type="button"
									disabled={busy}
									onClick={() =>
										act(async () => {
											await refreshFimaBis(current.id);
											await reload();
											setResults([
												"Pārbaudiet vēsturiskos BIS ierakstus un piesaistiet atrasto ierakstu. Pieprasījums netika atkārtots.",
											]);
										})
									}
								>
									Pārbaudīt pārtrauktu operāciju
								</button>
							)}
						{current.bisId && (
							<div className={styles.notice}>
								<p>
									BIS izveidoja:{" "}
									{current.snapshot?.reference?.created_by?.full_name ??
										"Vēl nav pārbaudīts"}
								</p>
								<button
									type="button"
									disabled={busy}
									onClick={() =>
										act(async () => {
											await refreshFimaBis(current.id);
											await reload();
										})
									}
								>
									Pārbaudīt dzīvo BIS ierakstu
								</button>
							</div>
						)}
					</aside>
				)}
			</div>
			<details className={styles.results}>
				<summary>BIS operāciju žurnāls ({data.operations.length})</summary>
				{data.operations.map((o) => (
					<p key={o.id}>
						{data.records.find((r) => r.id === o.recordId)?.localId} · {o.kind}{" "}
						· {o.status} · {o.createdAt}
						<small>{o.error}</small>
					</p>
				))}
			</details>
		</section>
	);
}
