"use client";

import {
	ArrowRight,
	ArrowUpRight,
	Bell,
	BookOpen,
	Boxes,
	Check,
	CheckCheck,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	CircleHelp,
	Clock3,
	Columns3,
	ExternalLink,
	FileSpreadsheet,
	FileText,
	Flag,
	FolderOpen,
	HardHat,
	LayoutDashboard,
	ListFilter,
	MoreHorizontal,
	Plus,
	Search,
	ShieldCheck,
	SlidersHorizontal,
	TrainFront,
	Trash2,
	Users,
	X,
} from "lucide-react";
import { useId, useState } from "react";
import styles from "./fima-workspace.module.css";

export type FimaRecord = {
	id: string;
	row: number;
	date: string;
	title: string;
	description: string;
	status: "draft" | "fima" | "recorded" | "pending" | "deleted";
	bisNumber: string | null;
	bisUrl: string | null;
	owner: string;
	quantity: string;
	unit: string;
	masts: string;
	materials: string;
	shift: string;
	workers: number | null;
	note: string;
	verification: string;
	action: string;
};

const statuses = {
	draft: { label: "Sagatave", color: "draft", icon: FileText },
	fima: { label: "FIMA ieraksts", color: "fima", icon: CheckCheck },
	recorded: { label: "Buvconsult ieraksts", color: "recorded", icon: Check },
	pending: { label: "Jāizveido no jauna", color: "pending", icon: Clock3 },
	deleted: { label: "Dzēsts", color: "deleted", icon: Trash2 },
} as const;

function Status({ record }: { record: FimaRecord }) {
	const status = statuses[record.status];
	return (
		<span className={`${styles.badge} ${styles[status.color]}`}>
			<status.icon size={12} />
			{status.label}
		</span>
	);
}

function FimaLogo({ className }: { className?: string }) {
	return (
		<img
			src="/logos/fima-official.png"
			alt="FIMA"
			width={117}
			height={36}
			className={className}
		/>
	);
}

function WorksRecordedLogo({ className }: { className?: string }) {
	return (
		<span className={`${styles.worksLogo} ${className ?? ""}`}>
			<span className={styles.worksLogoMark}>
				<img
					src="/logos/worksrecorded-letter.png"
					alt="WorksRecorded"
					width={226}
					height={187}
				/>
			</span>
			<span className={styles.worksWordmark} aria-hidden="true">
				Works<span>Recorded</span>
			</span>
		</span>
	);
}

function RailIllustration() {
	return (
		<svg
			className={styles.railIllustration}
			viewBox="0 0 400 130"
			fill="none"
			aria-hidden="true"
		>
			<path d="M0 127 400 56M0 113 400 42" stroke="#B8C8BB" strokeWidth="2" />
			<path
				d="m32 107 0-70 180-28v83M92 96V25L280 5v73M232 70V20l117-9v45"
				stroke="#879F8D"
				strokeWidth="2"
			/>
			<path
				d="m20 43 204-24m-143 11 210-20m-244 2 95 9 74-15 113 4"
				stroke="#A2B5A8"
			/>
			<path
				d="m38 37 12 27 163-27m-122-11 15 28 174-28m-48-6 10 18 107-15"
				stroke="#A2B5A8"
			/>
			<path
				d="m62 110 18 13m40-23 18 13m40-23 18 13m40-23 18 13m40-23 18 13m40-23 18 13"
				stroke="#B8C8BB"
				strokeWidth="2"
			/>
			<circle cx="212" cy="36" r="3" fill="#E9A06A" />
			<circle cx="281" cy="26" r="3" fill="#E9A06A" />
		</svg>
	);
}

export function FimaWorkspace({
	records,
	embedded = false,
	siteId,
}: {
	records: FimaRecord[];
	embedded?: boolean;
	siteId?: string;
}) {
	const overviewId = useId();
	const Content = embedded ? "section" : "main";
	const [query, setQuery] = useState("");
	const [tab, setTab] = useState("all");
	const [owner, setOwner] = useState("all");
	const [selectedId, setSelectedId] = useState("FIMA-029");
	const [detailTab, setDetailTab] = useState("record");
	const [page, setPage] = useState(0);
	const [board, setBoard] = useState(false);
	const [notice, setNotice] = useState("");
	const [detailOpen, setDetailOpen] = useState(true);
	const [followed, setFollowed] = useState<string[]>([]);
	const selected =
		records.find((record) => record.id === selectedId) ?? records[0];
	const drafts = records.filter((record) => record.status === "draft");
	const pending = records.filter((record) => record.status === "pending");
	const deleted = records.filter(
		(record) => record.status === "deleted" || record.status === "pending",
	);
	const normalizedQuery = query.toLocaleLowerCase("lv");
	const priority = [
		"FIMA-029",
		"FIMA-031",
		"FIMA-032",
		"FIMA-039",
		"FIMA-024",
		"FIMA-010",
		"FIMA-036",
		"FIMA-025",
	];
	const sorted = [...records].sort((a, b) => {
		const ai = priority.indexOf(a.id),
			bi = priority.indexOf(b.id);
		return (ai < 0 ? 100 + a.row : ai) - (bi < 0 ? 100 + b.row : bi);
	});
	const filtered = sorted.filter(
		(record) =>
			(tab === "all" ||
				(tab === "pending" && record.status === "pending") ||
				(tab === "draft" && record.status === "draft") ||
				(tab === "deleted" &&
					["deleted", "pending"].includes(record.status))) &&
			(owner === "all" || record.owner === owner) &&
			`${record.id} ${record.title} ${record.masts} ${record.bisNumber ?? ""}`
				.toLocaleLowerCase("lv")
				.includes(normalizedQuery),
	);
	const pageSize = 8;
	const visible = filtered.slice(page * pageSize, (page + 1) * pageSize);
	const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
	const select = (record: FimaRecord) => {
		setSelectedId(record.id);
		setDetailOpen(true);
		setDetailTab("record");
	};
	const changeTab = (next: string) => {
		setTab(next);
		setPage(0);
	};
	const formatDate = (date: string) =>
		`${date.slice(8, 10)}.${date.slice(5, 7)}.`;
	const toggleFollow = () =>
		setFollowed((ids) =>
			ids.includes(selected.id)
				? ids.filter((id) => id !== selected.id)
				: [...ids, selected.id],
		);

	return (
		<div
			className={`${styles.workspace} ${embedded ? styles.embedded : ""}`}
			data-flow="fima"
			data-site-id={siteId}
		>
			<aside className={styles.sidebar}>
				<a
					href={`#${overviewId}`}
					className={styles.brand}
					aria-label="WorksRecorded"
				>
					<WorksRecordedLogo />
				</a>
				<div className={styles.orgCard}>
					<FimaLogo className={styles.orgLogo} />
					<div>
						<strong>FIMA</strong>
						<span>Organizācijas vide</span>
					</div>
					<ChevronDown size={15} />
				</div>
				<span className={styles.navLabel}>DARBA VIETA</span>
				<nav aria-label="Galvenā navigācija">
					<button
						type="button"
						onClick={() => {
							changeTab("all");
							setNotice("Atvērts projekta pārskats.");
						}}
					>
						<LayoutDashboard size={18} />
						Pārskats
					</button>
					<button
						type="button"
						className={styles.navActive}
						onClick={() => changeTab("all")}
					>
						<ShieldCheck size={18} />
						BIS ieraksti<span>{records.length}</span>
					</button>
					<button
						type="button"
						onClick={() => {
							changeTab("all");
							setNotice("Darbu žurnāla skats ir daļa no šī dizaina prototipa.");
						}}
					>
						<BookOpen size={18} />
						Darbu žurnāls
					</button>
					<button
						type="button"
						onClick={() =>
							setNotice("Materiālu pievienošana šajā posmā ir atlikta.")
						}
					>
						<Boxes size={18} />
						Materiāli
					</button>
					<button
						type="button"
						onClick={() =>
							setNotice(
								"Komandas pārvaldības skats paredzēts nākamajam posmam.",
							)
						}
					>
						<Users size={18} />
						Komanda
					</button>
				</nav>
				<div className={styles.projectNav}>
					<span className={styles.navLabel}>AKTĪVAIS PROJEKTS</span>
					<div>
						<span className={styles.projectDot} />
						<span>
							Torņakalns–Olaine<small>Kontakttīkla modernizācija</small>
						</span>
					</div>
				</div>
				<div className={styles.sidebarBottom}>
					<div className={styles.connectionCard}>
						<span className={styles.bisSymbol}>BIS</span>
						<div>
							<strong>Excel momentuzņēmums</strong>
							<span>08.10.2026 · dizaina priekšskatījums</span>
						</div>
					</div>
					<button
						type="button"
						onClick={() =>
							setNotice(
								"Šis ir interaktīvs dizaina prototips. BIS dati netiek automātiski atjaunoti.",
							)
						}
					>
						<CircleHelp size={17} />
						Palīdzība un atbalsts
						<ArrowUpRight size={14} />
					</button>
					<div className={styles.profile}>
						<span>VG</span>
						<div>
							<strong>Vjačeslavs Gromatovičs</strong>
							<small>Buvconsult · projekta komanda</small>
						</div>
						<MoreHorizontal size={17} />
					</div>
				</div>
			</aside>

			<div className={styles.mainShell}>
				<header className={styles.topbar}>
					<div>
						<span>FIMA</span>
						<ChevronRight size={14} />
						<span>Projekti</span>
						<ChevronRight size={14} />
						<strong>Torņakalns–Olaine</strong>
					</div>
					<div className={styles.topbarRight}>
						<span className={styles.previewLabel}>Dizaina prototips</span>
						<button
							type="button"
							aria-label="Paziņojumi"
							onClick={() => {
								changeTab("pending");
								setNotice("Diviem ierakstiem vēl jāizveido aizvietojums.");
							}}
						>
							<Bell size={18} />
							<i />
						</button>
						<span className={styles.topAvatar}>VG</span>
					</div>
				</header>
				<Content className={styles.main} id={overviewId}>
					<div className={styles.pageHeading}>
						<div>
							<div className={styles.eyebrow}>
								<FimaLogo className={styles.headerLogo} />
								<span className={styles.divider} />
								<TrainFront size={13} /> DZELZCEĻA INFRASTRUKTŪRA
							</div>
							<h1>
								BIS darbu pārskats<span>.</span>
							</h1>
							<p>No darbu uzskaites līdz BIS ierakstam — viss vienuviet.</p>
						</div>
						<div className={styles.headingActions}>
							<button
								type="button"
								className={styles.secondaryButton}
								onClick={() =>
									setNotice(
										"Dati ņemti no “09-2026 - FIMA bis Buvconsult.xlsx”. Šis priekšskatījums nemaina Excel failu.",
									)
								}
							>
								<FileSpreadsheet size={16} />
								Excel avots
								<ArrowUpRight size={14} />
							</button>
							<button
								type="button"
								className={styles.primaryButton}
								onClick={() => {
									changeTab("pending");
									setNotice("Atvērti ieraksti, kuriem jāizveido aizvietojums.");
								}}
							>
								<Plus size={16} />
								Jauns ieraksts
							</button>
						</div>
					</div>

					<section
						className={styles.projectBanner}
						aria-label="Projekta informācija"
					>
						<div>
							<span className={styles.projectIcon}>
								<TrainFront size={23} />
							</span>
							<div>
								<h2>Torņakalns–Olaine</h2>
								<p>
									Kontakttīkla modernizācija <span>·</span> Olaine un posms
									Torņakalns–Olaine
								</p>
								<div className={styles.projectMeta}>
									<span>
										<FolderOpen size={13} />2 BIS būvniecības lietas
									</span>
									<span>
										<HardHat size={13} />
										FIMA / Buvconsult
									</span>
									<span>
										<Clock3 size={13} />
										01.–05. septembris, 2026
									</span>
								</div>
							</div>
						</div>
						<RailIllustration />
						<span className={styles.scopeBadge}>
							<span />
							Pārskatā līdz 05.09.
						</span>
					</section>

					<section className={styles.attentionStrip}>
						<span className={styles.attentionIcon}>
							<Flag size={16} />
						</span>
						<div>
							<strong>Divi darbi gaida jaunu ierakstu</strong>
							<span>
								FIMA-032 un FIMA-039 · materiālu pievienošana pagaidām atlikta.
							</span>
						</div>
						<button type="button" onClick={() => changeTab("pending")}>
							Skatīt darbus
							<ArrowRight size={15} />
						</button>
					</section>

					<div
						className={`${styles.recordsLayout} ${!detailOpen ? styles.detailClosed : ""}`}
					>
						<section className={styles.recordsCard} aria-label="Darbu ieraksti">
							<div className={styles.recordsHeader}>
								<div>
									<h2>
										Darbu ieraksti <span>{records.length}</span>
									</h2>
									<p>Excel uzskaite un pārbaudītie BIS rezultāti.</p>
								</div>
								<div className={styles.viewSwitcher}>
									<button
										type="button"
										aria-label="Tabulas skats"
										aria-pressed={!board}
										className={!board ? styles.viewActive : ""}
										onClick={() => setBoard(false)}
									>
										<FileText size={16} />
									</button>
									<button
										type="button"
										aria-label="Kolonnu skats"
										aria-pressed={board}
										className={board ? styles.viewActive : ""}
										onClick={() => setBoard(true)}
									>
										<Columns3 size={16} />
									</button>
								</div>
							</div>
							<div
								className={styles.tabs}
								role="tablist"
								aria-label="Ierakstu statuss"
							>
								{[
									{ key: "all", label: "Visi ieraksti", count: records.length },
									{
										key: "pending",
										label: "Jāpārskata",
										count: pending.length,
									},
									{ key: "draft", label: "Sagataves", count: drafts.length },
									{ key: "deleted", label: "Dzēstie", count: deleted.length },
								].map((item) => (
									<button
										type="button"
										role="tab"
										aria-selected={tab === item.key}
										key={item.key}
										className={tab === item.key ? styles.tabActive : ""}
										onClick={() => changeTab(item.key)}
									>
										{item.label}
										<span>{item.count}</span>
									</button>
								))}
							</div>
							<div className={styles.tableToolbar}>
								<label className={styles.searchBox}>
									<Search size={16} />
									<input
										aria-label="Meklēt darbus"
										placeholder="Meklēt darbu, balstu vai BIS numuru..."
										value={query}
										onChange={(event) => {
											setQuery(event.target.value);
											setPage(0);
										}}
									/>
									<kbd>⌘ K</kbd>
								</label>
								<label className={styles.ownerFilter}>
									<ListFilter size={14} />
									<select
										aria-label="Filtrēt pēc atbildīgās komandas"
										value={owner}
										onChange={(event) => {
											setOwner(event.target.value);
											setPage(0);
										}}
									>
										<option value="all">Visas komandas</option>
										<option value="FIMA">FIMA</option>
										<option value="Buvconsult">Buvconsult</option>
									</select>
								</label>
								<button
									type="button"
									className={styles.iconButton}
									aria-label="Notīrīt filtrus"
									onClick={() => {
										setQuery("");
										setOwner("all");
										changeTab("all");
									}}
								>
									<SlidersHorizontal size={16} />
								</button>
							</div>
							{board ? (
								<div className={styles.board}>
									{(
										["draft", "pending", "fima", "deleted", "recorded"] as const
									).map((status) => (
										<div className={styles.boardColumn} key={status}>
											<h3>
												{statuses[status].label}
												<span>
													{filtered.filter((r) => r.status === status).length}
												</span>
											</h3>
											{filtered
												.filter((r) => r.status === status)
												.map((record) => (
													<button
														type="button"
														key={record.id}
														onClick={() => select(record)}
													>
														<small>
															{record.id} · {formatDate(record.date)}
														</small>
														<strong>{record.title}</strong>
														<Status record={record} />
													</button>
												))}
										</div>
									))}
								</div>
							) : (
								<div className={styles.tableScroll}>
									<table>
										<thead>
											<tr>
												<th>Darbs / KUCE</th>
												<th>Datums</th>
												<th>BIS statuss</th>
												<th>Atbildīgais</th>
												<th aria-label="Detaļas" />
											</tr>
										</thead>
										<tbody>
											{visible.map((record) => (
												<tr
													key={record.id}
													className={
														selected.id === record.id && detailOpen
															? styles.selectedRow
															: ""
													}
												>
													<td>
														<button
															type="button"
															className={styles.recordButton}
															onClick={() => select(record)}
														>
															<span
																className={`${styles.recordIcon} ${styles[record.status]}`}
															>
																<FileText size={16} />
															</span>
															<span>
																<strong>{record.title}</strong>
																<small>
																	{record.id}
																	<span>·</span>
																	{record.masts.replaceAll("//", " → ")}
																</small>
															</span>
														</button>
													</td>
													<td>
														{formatDate(record.date)}
														<small>2026</small>
													</td>
													<td>
														<Status record={record} />
														<small>
															{record.status === "deleted" ||
															record.status === "pending"
																? `Bijušais Nr.${record.bisNumber}`
																: record.bisNumber
																	? `BIS Nr.${record.bisNumber}`
																	: "Excel ieraksts"}
														</small>
													</td>
													<td>
														<span
															className={`${styles.teamAvatar} ${record.owner === "FIMA" ? styles.fimaAvatar : ""}`}
														>
															{record.owner === "FIMA" ? (
																<FimaLogo className={styles.teamLogo} />
															) : (
																"B"
															)}
														</span>
														<span className={styles.ownerName}>
															{record.owner}
														</span>
													</td>
													<td>
														<button
															type="button"
															aria-label={`Skatīt ${record.id}`}
															className={styles.rowArrow}
															onClick={() => select(record)}
														>
															<ChevronRight size={16} />
														</button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
									{filtered.length === 0 ? (
										<div className={styles.emptyState}>
											<Search size={24} />
											<h3>Nav atrasts neviens ieraksts</h3>
											<p>Izmēģiniet citu darba, balsta vai BIS numuru.</p>
										</div>
									) : null}
								</div>
							)}
							<div className={styles.tableFooter}>
								<span>
									{board
										? `${filtered.length} ieraksti`
										: filtered.length === 0
											? "0 ieraksti"
											: `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)} no ${filtered.length} ierakstiem`}
									<span className={styles.footerSeparator}>·</span>Excel avots
								</span>
								{!board ? (
									<div>
										<button
											type="button"
											aria-label="Iepriekšējā lapa"
											disabled={page === 0}
											onClick={() => setPage((p) => p - 1)}
										>
											<ChevronLeft size={15} />
										</button>
										<span>
											{page + 1} / {pageCount}
										</span>
										<button
											type="button"
											aria-label="Nākamā lapa"
											disabled={page + 1 >= pageCount}
											onClick={() => setPage((p) => p + 1)}
										>
											<ChevronRight size={15} />
										</button>
									</div>
								) : null}
							</div>
						</section>

						{detailOpen ? (
							<aside
								className={styles.detailPanel}
								aria-label={`Ieraksta ${selected.id} detaļas`}
							>
								<div className={styles.detailTop}>
									<span>
										<span className={styles.smallOrangeDot} />
										IERAKSTA DETAĻAS
									</span>
									<button
										type="button"
										aria-label="Aizvērt detaļas"
										onClick={() => setDetailOpen(false)}
									>
										<X size={16} />
									</button>
								</div>
								<div className={styles.detailHeading}>
									<div>
										<span className={styles.detailId}>{selected.id}</span>
										<span className={styles.detailNumber}>
											{selected.bisNumber ? `Nr.${selected.bisNumber}` : "KUCE"}
										</span>
									</div>
									<h2>{selected.title}</h2>
									<Status record={selected} />
								</div>
								<div className={styles.detailTabs}>
									{[
										{ key: "record", label: "Ieraksts" },
										{ key: "notes", label: "FIMA piezīmes" },
										{ key: "history", label: "Vēsture" },
									].map((item) => (
										<button
											type="button"
											key={item.key}
											className={
												detailTab === item.key ? styles.detailTabActive : ""
											}
											onClick={() => setDetailTab(item.key)}
										>
											{item.label}
										</button>
									))}
								</div>
								{detailTab === "record" ? (
									<div className={styles.detailBody}>
										<div className={styles.quantityBlock}>
											<span>DARBU APJOMS</span>
											<strong>
												{Number.isFinite(
													Number(selected.quantity.replaceAll(",", "")),
												)
													? new Intl.NumberFormat("lv-LV", {
															maximumFractionDigits: 2,
														}).format(
															Number(selected.quantity.replaceAll(",", "")),
														)
													: selected.quantity}
												<small>{selected.unit}</small>
											</strong>
											<span>Atbilstoši precizētajai Excel uzskaitei</span>
										</div>
										<dl className={styles.detailFields}>
											<div>
												<dt>
													<Clock3 size={14} />
													Darbu datums
												</dt>
												<dd>{formatDate(selected.date)}2026</dd>
											</div>
											<div>
												<dt>
													<HardHat size={14} />
													Komanda
												</dt>
												<dd>{selected.owner}</dd>
											</div>
											<div>
												<dt>
													<Users size={14} />
													Darbinieki
												</dt>
												<dd>{selected.workers ?? "—"}</dd>
											</div>
											<div>
												<dt>
													<Clock3 size={14} />
													Maiņa
												</dt>
												<dd>{selected.shift}</dd>
											</div>
										</dl>
										<div className={styles.locationBlock}>
											<span>BALSTI / DARBA POSMS</span>
											<strong>{selected.masts.replaceAll("//", " → ")}</strong>
											<div className={styles.routeLine}>
												<i />
												<span />
												<i />
											</div>
											<small>Stacija Olaine / Torņakalns–Olaine</small>
										</div>
										<div className={styles.detailNote}>
											<ShieldCheck size={17} />
											<div>
												<strong>
													{selected.status === "draft"
														? "Sagatave izveidota"
														: selected.status === "pending"
															? "Aizvietojums vēl jāizveido"
															: selected.status === "deleted"
																? "Dzēšana pārbaudīta"
																: "Ieraksts norādīts Excel"}
												</strong>
												<p>
													{selected.status === "draft"
														? "Vjačeslava Gromatoviča profilā. Vēl nav iesniegta apstiprināšanai."
														: selected.status === "pending"
															? "Vecais BIS ieraksts dzēsts. Materiālu pievienošana pagaidām atlikta."
															: selected.status === "deleted"
																? "Vecais BIS ieraksts dzēsts, un Excel saite notīrīta."
																: "BIS apstiprināšanas statuss šajā prototipā netiek pārbaudīts tiešsaistē."}
												</p>
											</div>
										</div>
										<div className={styles.attachment}>
											<span>
												<FileSpreadsheet size={18} />
											</span>
											<div>
												<strong>09-2026 · FIMA bis Buvconsult</strong>
												<small>Excel avots · {selected.row}. rinda</small>
											</div>
											<ArrowUpRight size={15} />
										</div>
									</div>
								) : detailTab === "notes" ? (
									<div className={styles.notesBody}>
										<span className={styles.detailId}>FIMA / BUVCONSULT</span>
										<h3>Piezīmes un pārbaudes</h3>
										<p>
											{selected.note || "Šim ierakstam nav papildu piezīmju."}
										</p>
										<h3>Excel rīcības norāde</h3>
										<p>{selected.action || "Nav papildu norāžu."}</p>
									</div>
								) : (
									<div className={styles.timeline}>
										<div>
											<i />
											<span>08.10.2026</span>
											<strong>Excel momentuzņēmums</strong>
											<p>{selected.verification}</p>
										</div>
										<div>
											<i />
											<span>{formatDate(selected.date)}2026</span>
											<strong>Darbi reģistrēti uzskaitē</strong>
											<p>{selected.description}</p>
										</div>
									</div>
								)}
								<div className={styles.detailActions}>
									{selected.bisUrl ? (
										<a
											href={selected.bisUrl}
											target="_blank"
											rel="noreferrer"
											className={styles.primaryButton}
										>
											Atvērt BIS ierakstu
											<ExternalLink size={14} />
										</a>
									) : (
										<button
											type="button"
											className={styles.secondaryButton}
											onClick={() =>
												setNotice(
													"Vecais ieraksts ir dzēsts. Šajā prototipā jauni BIS ieraksti netiek izveidoti.",
												)
											}
										>
											Skatīt dzēšanas rezultātu
											<ShieldCheck size={14} />
										</button>
									)}
									<button
										type="button"
										className={styles.followButton}
										aria-pressed={followed.includes(selected.id)}
										onClick={toggleFollow}
									>
										{followed.includes(selected.id) ? (
											<Check size={14} />
										) : (
											<Bell size={14} />
										)}
										{followed.includes(selected.id)
											? "Pievienots sekošanai"
											: "Sekot ierakstam"}
									</button>
								</div>
							</aside>
						) : null}
					</div>
					<footer className={styles.pageFooter}>
						<span>
							<ShieldCheck size={13} />
							Excel momentuzņēmums · 08.10.2026. · BIS statusi netiek atjaunoti
							tiešsaistē.
						</span>
						<span>
							<FimaLogo className={styles.footerLogo} /> <span>×</span>
							<WorksRecordedLogo className={styles.footerWorksLogo} />
						</span>
					</footer>
				</Content>
			</div>
			{notice ? (
				<output className={styles.toast}>
					<span>
						<Check size={16} />
					</span>
					<p>{notice}</p>
					<button
						type="button"
						aria-label="Aizvērt paziņojumu"
						onClick={() => setNotice("")}
					>
						<X size={16} />
					</button>
				</output>
			) : null}
		</div>
	);
}
