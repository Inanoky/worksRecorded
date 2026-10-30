"use client";

import {
	Copy,
	ExternalLink,
	FileCheck2,
	MessageSquare,
	Pencil,
	Search,
} from "lucide-react";
import {
	Fragment,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { FimaActsRefreshButton } from "@/components/sitediary/FimaActsRefreshButton";
import { FimaPagination } from "@/components/sitediary/FimaPagination";
import { useFimaFilterReturn } from "@/components/sitediary/useFimaFilterReturn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	getFimaAcceptanceActUrl,
	getFimaActStatusLabel,
} from "@/lib/fima/acceptance-acts";
import {
	actKey,
	type FimaActRow,
	type FimaActSetting,
	type FimaActsData,
} from "@/lib/fima/act-register";
import { formatFimaDiaryNumber } from "@/lib/fima/diary-number";
import { getFimaActsForSite } from "@/server/actions/fima-acts";
import { FimaActDetail, type FimaActDetailTab } from "./FimaActDetail";
import { FimaActExamplesDialog } from "./FimaActExamplesDialog";

type Filters = { query: string; status: string; examples: string };
const emptyFilters: Filters = { query: "", status: "", examples: "" };
const isFiltered = (value: Filters) =>
	Boolean(value.query.trim() || value.status || value.examples);
function workTitles(row: FimaActRow) {
	return [
		...new Set(
			row.records
				.map((record) => record.Works_Custom_1 || record.Works)
				.filter(Boolean),
		),
	];
}
function nextStep(row: FimaActRow) {
	if (row.status === "approved") return "Apstiprināts";
	if (row.status === "approving") return "Gaida apstiprinājumu";
	const native = new Set(row.works.map((work) => work.id));
	if (row.plannedWorks.some((work) => !native.has(work.id)))
		return "Jāpiesaista plānotie darbi BIS";
	if (!row.works.length) return "Jāpārbauda darbu piesaiste BIS";
	if (!row.examples.length) return "Jāizvēlas paraugs";
	return "Jāpārbauda akts un pielikumi BIS";
}
const dateLabel = (date: string | null) =>
	date && Number.isFinite(Date.parse(date))
		? new Date(date).toLocaleDateString("lv-LV", { timeZone: "Europe/Riga" })
		: "Datums nav norādīts";

export function FimaActsPage({ initial }: { initial: FimaActsData }) {
	const searchId = useId();
	const [data, setData] = useState(initial);
	const [filters, setFilters] = useState<Filters>(emptyFilters);
	const [page, setPage] = useState(1);
	const [opened, setOpened] = useState<{
		key: string;
		tab: FimaActDetailTab;
	} | null>(null);
	const [editing, setEditing] = useState<string | null>(null);
	const container = useRef<HTMLDivElement>(null);
	const position = useFimaFilterReturn(`acts:${data.siteId}`, container);
	const statuses = [...new Set(data.rows.map((row) => row.status))].sort();
	const filtered = useMemo(
		() =>
			data.rows.filter((row) => {
				if (filters.status && row.status !== filters.status) return false;
				if (
					(filters.examples === "with" && !row.examples.length) ||
					(filters.examples === "without" && row.examples.length)
				)
					return false;
				const search = [
					row.localNumber,
					row.number,
					row.id,
					row.title,
					data.caseId,
					...workTitles(row),
					...row.records.flatMap((record) => [
						formatFimaDiaryNumber(record.fimaNumber),
						record.Location,
						...record.fimaBisRecords.map((link) => link.number ?? link.id),
					]),
					...row.examples.flatMap((example) => [
						example.id,
						"number" in example ? example.number : null,
						"siteName" in example ? example.siteName : null,
					]),
				]
					.join(" ")
					.toLocaleLowerCase("lv-LV");
				return search.includes(filters.query.trim().toLocaleLowerCase("lv-LV"));
			}),
		[data, filters],
	);
	const totalPages = Math.max(1, Math.ceil(filtered.length / 25));
	const currentPage = Math.min(page, totalPages);
	const visible = filtered.slice((currentPage - 1) * 25, currentPage * 25);
	useLayoutEffect(() => position.restore());
	const changeFilters = (next: Filters) => {
		setPage(
			position.change(isFiltered(filters), isFiltered(next), currentPage),
		);
		setFilters(next);
	};
	const update = (key: string, setting: FimaActSetting) =>
		setData((value) => ({
			...value,
			rows: value.rows.map((row) =>
				row.key === key
					? {
							...row,
							setting,
							examples: setting.examples.map(
								(reference) =>
									value.choices.find(
										(choice) =>
											choice.siteId === reference.siteId &&
											choice.caseId === reference.caseId &&
											actKey(choice.collection, choice.id) ===
												actKey(reference.collection, reference.id),
									) ?? { ...reference, unavailable: true as const },
							),
						}
					: row,
			),
		}));
	const open = (row: FimaActRow, tab: FimaActDetailTab) =>
		setOpened({ key: row.key, tab });
	const editRow = data.rows.find((row) => row.key === editing);
	const counts = {
		draft: data.rows.filter((row) => row.status === "draft").length,
		approving: data.rows.filter((row) => row.status === "approving").length,
		approved: data.rows.filter((row) => row.status === "approved").length,
	};
	const summary = filtered.length
		? `Rāda ${(currentPage - 1) * 25 + 1}–${Math.min(currentPage * 25, filtered.length)} no ${filtered.length} aktiem`
		: "Nav atbilstošu aktu";
	return (
		<div
			ref={container}
			className="mx-auto w-full max-w-[1800px] space-y-5 p-3 sm:p-6"
		>
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<div className="mb-1 flex items-center gap-2">
						<FileCheck2 className="size-5 text-primary" />
						<h1 className="text-2xl font-semibold">Akti</h1>
					</div>
					<p className="text-sm text-muted-foreground">
						{data.siteName} · BIS lieta {data.caseId}
					</p>
				</div>
				<div className="space-y-2 text-right">
					<FimaActsRefreshButton
						siteId={data.siteId}
						label="Atjaunot no BIS"
						onRefreshed={async () =>
							setData(await getFimaActsForSite(data.siteId))
						}
					/>
					<p className="text-xs text-muted-foreground">
						{data.checkedAt
							? `Pilna BIS sinhronizācija: ${new Date(data.checkedAt).toLocaleString("lv-LV", { timeZone: "Europe/Riga" })}`
							: "BIS dati vēl nav ielādēti"}
					</p>
				</div>
			</header>
			<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
				{[
					["Visi akti", data.rows.length],
					["Sagatavošanā", counts.draft],
					["Apstiprināšanā", counts.approving],
					["Apstiprināti", counts.approved],
				].map(([label, count]) => (
					<div key={label} className="rounded-lg border bg-card px-4 py-3">
						<p className="text-xs text-muted-foreground">{label}</p>
						<p className="mt-1 text-2xl font-semibold tabular-nums">{count}</p>
					</div>
				))}
			</div>
			<section
				aria-label="Aktu filtri"
				className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4"
			>
				<label
					htmlFor={searchId}
					className="min-w-[200px] flex-1 space-y-1 text-xs text-muted-foreground"
				>
					<span>Meklēt visos aktos</span>
					<span className="relative block">
						<Search className="pointer-events-none absolute left-3 top-3 size-4" />
						<Input
							id={searchId}
							className="pl-9"
							value={filters.query}
							onChange={(event) =>
								changeFilters({ ...filters, query: event.target.value })
							}
							placeholder="FIMA, BIS, akta Nr., darbs, balsts..."
						/>
					</span>
				</label>
				<label className="space-y-1 text-xs text-muted-foreground">
					<span>BIS statuss</span>
					<select
						value={filters.status}
						onChange={(event) =>
							changeFilters({ ...filters, status: event.target.value })
						}
						className="block h-10 rounded-md border bg-background px-3 text-sm text-foreground"
					>
						<option value="">Visi statusi</option>
						{statuses.map((status) => (
							<option key={status} value={status}>
								{getFimaActStatusLabel(status)}
							</option>
						))}
					</select>
				</label>
				<label className="space-y-1 text-xs text-muted-foreground">
					<span>Paraugs</span>
					<select
						value={filters.examples}
						onChange={(event) =>
							changeFilters({ ...filters, examples: event.target.value })
						}
						className="block h-10 rounded-md border bg-background px-3 text-sm text-foreground"
					>
						<option value="">Visi akti</option>
						<option value="with">Ar paraugu</option>
						<option value="without">Bez parauga</option>
					</select>
				</label>
				<Button
					variant="ghost"
					disabled={!isFiltered(filters)}
					onClick={() => changeFilters(emptyFilters)}
				>
					Notīrīt filtrus
				</Button>
			</section>
			<FimaPagination
				page={currentPage}
				totalPages={totalPages}
				summary={summary}
				onPageChange={setPage}
				label="Aktu lapas"
			/>
			<div className="overflow-hidden rounded-lg border bg-card">
				<div className="hidden grid-cols-[minmax(180px,1fr)_minmax(220px,1.5fr)_minmax(150px,0.9fr)_minmax(220px,1.3fr)_minmax(180px,1fr)] gap-5 border-b bg-muted/40 px-5 py-3 text-xs font-medium text-muted-foreground xl:grid">
					<span>Akts / datums</span>
					<span>Darbs / tvērums</span>
					<span>Ikdienas darbi</span>
					<span>Paraugs</span>
					<span>Statuss / nākamais solis</span>
				</div>
				{visible.map((row) => {
					const titles = workTitles(row);
					const native = new Set(row.works.map((work) => work.id));
					const pending = new Set(
						row.plannedWorks
							.filter((work) => !native.has(work.id))
							.map((work) => work.id),
					).size;
					return (
						<Fragment key={row.key}>
							<article
								aria-label={row.localNumber}
								className="grid min-w-0 gap-5 border-b px-4 py-5 last:border-b-0 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(220px,1.5fr)_minmax(150px,0.9fr)_minmax(220px,1.3fr)_minmax(180px,1fr)] xl:px-5"
							>
								<div className="min-w-0 space-y-2">
									<div className="flex items-center gap-1">
										<span className="font-mono text-xs font-medium">
											{row.localNumber}
										</span>
										<Button
											size="icon"
											variant="ghost"
											className="size-6 shrink-0"
											aria-label={`Kopēt ${row.localNumber}`}
											onClick={async () => {
												try {
													await navigator.clipboard.writeText(row.localNumber);
													toast.success("Numurs nokopēts.");
												} catch {
													toast.error("Neizdevās nokopēt numuru.");
												}
											}}
										>
											<Copy className="size-3" />
										</Button>
									</div>
									<a
										href={
											getFimaAcceptanceActUrl(row.collection, row.id) ??
											undefined
										}
										target="_blank"
										rel="noopener noreferrer"
										className="block break-words text-sm font-medium text-primary underline underline-offset-2"
									>
										{row.number ?? `BIS sagatave ${row.id}`}
									</a>
									<p className="text-xs text-muted-foreground">
										{dateLabel(row.date)}
									</p>
								</div>
								<div className="min-w-0 space-y-2">
									<p className="text-xs text-muted-foreground xl:hidden">
										Darbs / tvērums
									</p>
									{row.title ? (
										<p className="whitespace-pre-wrap text-sm font-medium">
											{row.title}
										</p>
									) : null}
									{titles.length ? (
										<p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed">
											{titles.join("; ")}
										</p>
									) : (
										<p className="text-sm text-muted-foreground">
											Darba apraksts nav piesaistīts.
										</p>
									)}
									<p className="text-xs text-muted-foreground">
										{[
											...new Set(
												row.records
													.map((record) => record.Location)
													.filter(Boolean),
											),
										].join("; ")}
									</p>
								</div>
								<div className="space-y-2">
									<p className="text-xs text-muted-foreground xl:hidden">
										Ikdienas darbi
									</p>
									<button
										type="button"
										className="block text-left text-sm font-medium text-primary underline underline-offset-2"
										onClick={() => open(row, "works")}
									>
										{native.size} iekļauti BIS aktā
									</button>
									{pending ? (
										<p className="text-xs text-amber-700 dark:text-amber-400">
											{pending} tikai plānoti
										</p>
									) : null}
									<p className="text-xs text-muted-foreground">
										{row.records.length} WorksRecorded ieraksti
									</p>
								</div>
								<div className="min-w-0 space-y-2">
									<div className="flex items-center justify-between gap-2">
										<p className="text-xs text-muted-foreground xl:hidden">
											Paraugs
										</p>
										<Button
											size="sm"
											variant="ghost"
											className="ml-auto h-7 gap-1 px-2 text-xs"
											onClick={() => setEditing(row.key)}
											aria-label={`Izvēlēties paraugu ${row.localNumber}`}
										>
											<Pencil className="size-3" />
											Izvēlēties
										</Button>
									</div>
									{row.examples.length ? (
										row.examples.map((example) => (
											<div
												key={`${example.siteId}:${example.collection}/${example.id}`}
												className="rounded-md border bg-muted/20 p-2"
											>
												<a
													className="block break-words text-sm text-primary underline underline-offset-2"
													href={
														getFimaAcceptanceActUrl(
															example.collection,
															example.id,
														) ?? undefined
													}
													target="_blank"
													rel="noopener noreferrer"
												>
													{"number" in example
														? (example.number ?? `BIS ${example.id}`)
														: `BIS ${example.id}`}
												</a>
												<p className="mt-1 text-xs text-muted-foreground">
													{"siteName" in example
														? example.siteName
														: "Saglabāta atsauce · dati nav pieejami"}
												</p>
											</div>
										))
									) : (
										<p className="text-sm text-muted-foreground">
											Nav piesaistīts
										</p>
									)}
									{row.examples.length ? (
										<button
											type="button"
											className="text-xs text-primary underline"
											onClick={() => open(row, "examples")}
										>
											Salīdzināt ar paraugu
										</button>
									) : null}
								</div>
								<div className="space-y-3">
									<Badge
										variant="outline"
										className="h-auto whitespace-normal py-1"
									>
										{getFimaActStatusLabel(row.status)}
									</Badge>
									<p className="text-xs text-muted-foreground">
										{nextStep(row)}
									</p>
									<div className="flex flex-wrap items-center gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() => open(row, "works")}
										>
											Atvērt
										</Button>
										<Button
											variant="ghost"
											size="sm"
											aria-label={`Komentāri ${row.localNumber}`}
											onClick={() => open(row, "comments")}
										>
											<MessageSquare className="size-4" />
											{row.setting.history.filter(
												(event) => event.kind === "comment",
											).length || null}
										</Button>
										<a
											href={
												getFimaAcceptanceActUrl(row.collection, row.id) ??
												undefined
											}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1 text-xs text-primary"
										>
											BIS
											<ExternalLink className="size-3" />
										</a>
									</div>
								</div>
							</article>
							{opened?.key === row.key ? (
								<FimaActDetail
									key={row.key}
									siteId={data.siteId}
									row={row}
									tab={opened.tab}
									onTabChange={(tab) => setOpened({ key: row.key, tab })}
									onClose={() => setOpened(null)}
									onSaved={(setting) => update(row.key, setting)}
								/>
							) : null}
						</Fragment>
					);
				})}
				{!visible.length ? (
					<div className="space-y-2 p-10 text-center">
						<p className="font-medium">
							{data.rows.length
								? "Atbilstošu aktu nav"
								: "Šim projektam vēl nav ielādētu aktu"}
						</p>
						<p className="text-sm text-muted-foreground">
							{data.rows.length
								? "Mainiet meklēšanu vai notīriet filtrus."
								: "Izmantojiet “Atjaunot no BIS”, lai ielādētu esošos aktus."}
						</p>
					</div>
				) : null}
			</div>
			{totalPages > 1 ? (
				<FimaPagination
					page={currentPage}
					totalPages={totalPages}
					summary={summary}
					onPageChange={setPage}
					label="Aktu lapas apakšā"
				/>
			) : null}
			{editRow ? (
				<FimaActExamplesDialog
					key={editRow.key}
					siteId={data.siteId}
					row={editRow}
					choices={data.choices}
					onClose={() => setEditing(null)}
					onSaved={(setting) => update(editRow.key, setting)}
				/>
			) : null}
		</div>
	);
}
