"use client";

import {
	ArrowDownRight,
	ArrowUpRight,
	ChevronRight,
	ExternalLink,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import type { Forma2ClientCosts } from "../lib/forma2-client-costs";
import {
	buildSpendingEntries,
	type SpendingKind,
	type SpendingPeriod,
	type SpendingWorkGroup,
	spendingBucket,
	spendingTimeline,
	spendingWorkTimeline,
} from "../lib/spending-timeline";
import { SpendingProjection } from "./SpendingProjection";
import { WorkCompletion } from "./WorkCompletion";

type Reassignment = { from: string; to: string; amount: number };
const kinds: { key: SpendingKind; label: string; color: string }[] = [
	{ key: "material", label: "Materiāli", color: "var(--primary)" },
	{ key: "work", label: "Darbs", color: "var(--foreground)" },
	{ key: "mechanism", label: "Mehānismi", color: "var(--chart-2)" },
];
const currency = (value: number) =>
	new Intl.NumberFormat("lv-LV", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 2,
	}).format(value);
const shortDate = (date: string) => `${date.slice(8, 10)}.${date.slice(5, 7)}.`;

export function DefaultConstructionSpendingPreview({
	current,
	proposed,
	reassignments,
	sourceTexts = {},
	siteName,
	workGroups,
	positionGroups,
	demonstration = false,
}: {
	current: Forma2ClientCosts;
	proposed: Forma2ClientCosts;
	reassignments: Reassignment[];
	sourceTexts?: Record<string, string>;
	siteName: string;
	workGroups: SpendingWorkGroup[];
	positionGroups: Record<string, string>;
	demonstration?: boolean;
}) {
	const [includeChanges, setIncludeChanges] = useState(true);
	const [section, setSection] = useState("");
	const [work, setWork] = useState("");
	const [mode, setMode] = useState<"cumulative" | "daily">("cumulative");
	const [period, setPeriod] = useState<SpendingPeriod>("week");
	const [bucket, setBucket] = useState<string | null>(null);
	const [hiddenGroups, setHiddenGroups] = useState<string[]>([]);
	const entries = useMemo(
		() => buildSpendingEntries(includeChanges ? proposed : current),
		[current, proposed, includeChanges],
	);
	const dates = useMemo(
		() => entries.flatMap((row) => (row.date ? [row.date] : [])).sort(),
		[entries],
	);
	const first = dates[0] ?? "2026-01-01";
	const last = dates.at(-1) ?? first;
	const [from, setFrom] = useState(first);
	const [to, setTo] = useState(last);
	const sections = useMemo(
		() => [
			...new Map(entries.map((row) => [row.sectionId, row.section])).entries(),
		],
		[entries],
	);
	const works = useMemo(
		() =>
			workGroups.filter((group) =>
				entries.some(
					(entry) =>
						(!section || entry.sectionId === section) &&
						(positionGroups[entry.positionId] ?? "other") === group.id,
				),
			),
		[entries, section, workGroups, positionGroups],
	);
	const valid = Boolean(from && to && from <= to);
	const visibleWorkGroups = works.filter((group) => !work || group.id === work);
	const timeline = useMemo(
		() =>
			spendingTimeline(
				valid
					? entries.filter(
							(entry) =>
								!work || (positionGroups[entry.positionId] ?? "other") === work,
						)
					: [],
				{
					from: valid ? from : first,
					to: valid ? to : last,
					period,
					cumulative: mode === "cumulative",
					sectionId: section,
				},
			),
		[
			entries,
			from,
			to,
			first,
			last,
			valid,
			period,
			mode,
			section,
			work,
			positionGroups,
		],
	);
	const workPoints = useMemo(
		() =>
			spendingWorkTimeline(timeline.entries, positionGroups, workGroups, {
				from: valid ? from : first,
				to: valid ? to : last,
				period,
			}),
		[
			timeline.entries,
			positionGroups,
			workGroups,
			from,
			to,
			first,
			last,
			valid,
			period,
		],
	);
	const selectedEntries = timeline.entries
		.filter(
			(row) =>
				!bucket || (row.date && spendingBucket(row.date, period) === bucket),
		)
		.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
	const selectedTotal =
		selectedEntries.reduce((sum, row) => sum + (row.cents ?? 0), 0) / 100;
	const chooseBucket = (state: { activeLabel?: string | number | null }) => {
		if (state.activeLabel != null) setBucket(String(state.activeLabel));
	};
	const filters = () => setBucket(null);
	const chartParts = (
		<>
			<CartesianGrid vertical={false} stroke="var(--border)" />
			<XAxis
				dataKey="date"
				tickFormatter={shortDate}
				tickLine={false}
				axisLine={false}
				minTickGap={36}
				tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
				dy={12}
			/>
			<YAxis
				width={65}
				tickFormatter={(value) =>
					`${new Intl.NumberFormat("lv-LV", { maximumFractionDigits: 1 }).format(Number(value) / 1000)} tūkst.`
				}
				tickLine={false}
				axisLine={false}
				tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
			/>
			<Tooltip
				labelFormatter={(label) => shortDate(String(label))}
				formatter={(value, name) => [currency(Number(value)), name]}
				contentStyle={{
					background: "var(--popover)",
					border: "1px solid var(--border)",
					borderRadius: 10,
					color: "var(--foreground)",
				}}
				itemStyle={{ color: "var(--foreground)" }}
				cursor={{ stroke: "var(--border)" }}
			/>
		</>
	);

	return (
		<main className="mx-auto max-w-[1560px] space-y-6 px-5 py-8 md:px-9">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
						<span>{siteName}</span>
						<ChevronRight className="size-3" />
						<span>Analītika</span>
					</div>
					<h1 className="text-3xl font-semibold tracking-tight">
						Izmaksu dinamika
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Darbu, materiālu un mehānismu izmaksas laika gaitā.
					</p>
				</div>
				<span className="rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground">
					{demonstration
						? "Demonstrācijas dati · nav projekta faktiskie dati"
						: "Priekšskatījums · dati netiek mainīti"}
				</span>
			</div>

			<SpendingProjection data={proposed} asOf={last} />

			<div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
				<label className="space-y-1.5 text-xs text-muted-foreground">
					<span className="block">Sekcija</span>
					<select
						aria-label="Sekcija"
						className="h-10 w-48 rounded-lg border bg-background px-3 text-sm text-foreground"
						value={section}
						onChange={(event) => {
							setSection(event.target.value);
							setWork("");
							filters();
						}}
					>
						<option value="">Viss projekts</option>
						{sections.map(([id, name]) => (
							<option key={id} value={id}>
								{name}
							</option>
						))}
					</select>
				</label>
				<label className="space-y-1.5 text-xs text-muted-foreground">
					<span className="block">Darbs</span>
					<select
						aria-label="Darbs"
						className="h-10 w-64 rounded-lg border bg-background px-3 text-sm text-foreground"
						value={work}
						onChange={(event) => {
							setWork(event.target.value);
							filters();
						}}
					>
						<option value="">Visi darbi</option>
						{works.map(({ id, label }) => (
							<option key={id} value={id}>
								{label}
							</option>
						))}
					</select>
				</label>
				<label className="space-y-1.5 text-xs text-muted-foreground">
					<span className="block">No</span>
					<input
						aria-label="No"
						type="date"
						className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground"
						value={from}
						onChange={(event) => {
							setFrom(event.target.value);
							filters();
						}}
					/>
				</label>
				<label className="space-y-1.5 text-xs text-muted-foreground">
					<span className="block">Līdz</span>
					<input
						aria-label="Līdz"
						type="date"
						className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground"
						value={to}
						onChange={(event) => {
							setTo(event.target.value);
							filters();
						}}
					/>
				</label>
				<Button
					variant="ghost"
					className="h-10"
					onClick={() => {
						setFrom(first);
						setTo(last);
						filters();
					}}
				>
					Viss periods
				</Button>
			</div>
			{!valid ? (
				<p role="alert" className="text-sm text-destructive">
					Izvēlieties derīgu datumu periodu.
				</p>
			) : null}

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{([{ key: "total", label: "Izmaksas kopā" }, ...kinds] as const).map(
					(item) => (
						<div
							key={item.key}
							className={`rounded-xl border p-5 ${item.key === "total" ? "border-primary/40 bg-accent" : "bg-card"}`}
						>
							<p className="text-sm text-muted-foreground">{item.label}</p>
							<p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
								{currency(timeline.totals[item.key])}
							</p>
							<p className="mt-2 text-xs text-muted-foreground">
								{shortDate(from)}–{shortDate(to)}
								{item.key === "work" ? " · Begin faktiskās izmaksas" : ""}
							</p>
						</div>
					),
				)}
			</div>

			{valid ? (
				<WorkCompletion
					data={proposed}
					workGroups={workGroups}
					positionGroups={positionGroups}
					asOf={to}
					from={from}
					sectionId={section}
					workId={work}
				/>
			) : null}

			<section className="rounded-xl border bg-card">
				<div className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-5">
					<div>
						<h2 className="font-semibold">
							{mode === "cumulative"
								? "Uzkrātās izmaksas"
								: "Izmaksas pa periodiem"}
						</h2>
						<p className="mt-1 text-xs text-muted-foreground">
							{mode === "cumulative"
								? "Uzkrājums no izvēlētā perioda sākuma"
								: "Katras dienas, nedēļas vai mēneša izmaksas"}{" "}
							· EUR
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<div className="flex rounded-lg bg-muted p-1">
							{(
								[
									{ key: "cumulative", label: "Uzkrājums" },
									{ key: "daily", label: "Pa periodiem" },
								] as const
							).map((item) => (
								<button
									type="button"
									key={item.key}
									aria-pressed={mode === item.key}
									className={`rounded-md px-3 py-1.5 text-xs ${mode === item.key ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
									onClick={() => {
										setMode(item.key);
										filters();
									}}
								>
									{item.label}
								</button>
							))}
						</div>
						<select
							aria-label="Grupēt pēc"
							className="h-9 rounded-lg border bg-background px-3 text-xs"
							value={period}
							onChange={(event) => {
								setPeriod(event.target.value as SpendingPeriod);
								filters();
							}}
						>
							<option value="day">Dienas</option>
							<option value="week">Nedēļas</option>
							<option value="month">Mēneši</option>
						</select>
					</div>
				</div>
				<div className="px-3 pt-6 sm:px-6">
					<div
						className="h-[340px] w-full"
						role="img"
						aria-label={`Izmaksas laikā no ${from} līdz ${to}. Kopā ${currency(timeline.totals.total)}.`}
					>
						<ResponsiveContainer width="100%" height="100%">
							{mode === "cumulative" ? (
								<AreaChart
									data={timeline.points}
									margin={{ top: 12, right: 18, left: 2, bottom: 20 }}
									onClick={chooseBucket}
									accessibilityLayer
								>
									{chartParts}
									{kinds.map((kind) => (
										<Area
											key={kind.key}
											name={kind.label}
											dataKey={kind.key}
											stackId="cost"
											type="linear"
											stroke={kind.color}
											fill={kind.color}
											fillOpacity={kind.key === "material" ? 0.28 : 0.14}
											strokeWidth={2}
											isAnimationActive={false}
										/>
									))}
								</AreaChart>
							) : (
								<BarChart
									data={timeline.points}
									margin={{ top: 12, right: 18, left: 2, bottom: 20 }}
									onClick={chooseBucket}
									accessibilityLayer
								>
									{chartParts}
									{kinds.map((kind) => (
										<Bar
											key={kind.key}
											name={kind.label}
											dataKey={kind.key}
											stackId="cost"
											fill={kind.color}
											maxBarSize={38}
											isAnimationActive={false}
										/>
									))}
								</BarChart>
							)}
						</ResponsiveContainer>
					</div>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-4 px-6 pb-5 pt-3">
					<div className="flex flex-wrap gap-5 text-xs">
						{kinds.map((kind) => (
							<span key={kind.key} className="flex items-center gap-2">
								<span
									className="size-2.5 rounded-full"
									style={{ background: kind.color }}
								/>
								{kind.label}
							</span>
						))}
					</div>
					<p className="text-xs text-muted-foreground">
						Noklikšķiniet grafikā, lai apskatītu izmaksu avotus.
					</p>
				</div>
			</section>

			<section className="rounded-xl border bg-card">
				<div className="border-b px-6 py-5">
					<h2 className="font-semibold">Uzkrātās izmaksas pa darbiem</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						Visas izmaksas katram darbam · Izpildshēmu grupas un krāsas · no
						izvēlētā perioda sākuma
					</p>
				</div>
				<div className="flex flex-wrap gap-3 px-6 pt-5">
					{visibleWorkGroups.map((group) => (
						<button
							type="button"
							key={group.id}
							aria-pressed={!hiddenGroups.includes(group.id)}
							onClick={() =>
								setHiddenGroups((hidden) =>
									hidden.includes(group.id)
										? hidden.filter((id) => id !== group.id)
										: [...hidden, group.id],
								)
							}
							className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${hiddenGroups.includes(group.id) ? "opacity-40" : ""}`}
						>
							<span
								className="size-2.5 rounded-full"
								style={{ background: group.color }}
							/>
							{group.label}
							<span className="font-medium tabular-nums">
								{currency(workPoints.at(-1)?.values[group.id] ?? 0)}
							</span>
						</button>
					))}
				</div>
				<div
					className="h-[340px] px-3 pt-6 sm:px-6"
					role="img"
					aria-label="Kumulatīvās izmaksu līnijas pa darbu grupām"
				>
					<ResponsiveContainer width="100%" height="100%">
						<LineChart
							data={workPoints}
							onClick={chooseBucket}
							margin={{ top: 12, right: 18, left: 2, bottom: 20 }}
							accessibilityLayer
						>
							{chartParts}
							{visibleWorkGroups.map((group) => (
								<Line
									key={group.id}
									dataKey={(point: { values: Record<string, number> }) =>
										point.values[group.id] ?? 0
									}
									name={group.label}
									stroke={group.color}
									strokeWidth={2.5}
									hide={hiddenGroups.includes(group.id)}
									dot={false}
									isAnimationActive={false}
								/>
							))}
						</LineChart>
					</ResponsiveContainer>
				</div>
			</section>

			<section className="rounded-xl border bg-card">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
					<div>
						<h2 className="font-semibold">
							Izmaksu avoti {bucket ? `· ${shortDate(bucket)}` : ""}
						</h2>
						<p className="mt-1 text-xs text-muted-foreground">
							{
								new Set(
									selectedEntries.map(
										(row) => `${row.sourceType}:${row.sourceId}`,
									),
								).size
							}{" "}
							avoti · {currency(selectedTotal)}
						</p>
					</div>
					{bucket ? (
						<Button variant="ghost" size="sm" onClick={() => setBucket(null)}>
							Rādīt visu periodu
						</Button>
					) : null}
				</div>
				<div className="max-h-[360px] overflow-auto">
					<table className="w-full text-left text-sm">
						<thead className="sticky top-0 bg-card text-xs text-muted-foreground">
							<tr>
								<th className="px-6 py-3 font-normal">Datums</th>
								<th className="px-4 py-3 font-normal">Avots</th>
								<th className="px-4 py-3 font-normal">Pozīcija</th>
								<th className="px-6 py-3 text-right font-normal">Summa</th>
							</tr>
						</thead>
						<tbody>
							{selectedEntries.map((row) => (
								<tr key={row.id} className="border-t align-top">
									<td className="whitespace-nowrap px-6 py-3 text-xs text-muted-foreground">
										{row.date ? shortDate(row.date) : "Bez datuma"}
									</td>
									<td className="max-w-[450px] px-4 py-3">
										{sourceTexts[row.sourceId] ? (
											<details>
												<summary className="cursor-pointer">
													{row.label}
												</summary>
												<pre className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-3 font-sans text-xs text-muted-foreground">
													{sourceTexts[row.sourceId]}
												</pre>
											</details>
										) : (
											<span>{row.label}</span>
										)}
										{row.invoiceUrl ? (
											<a
												href={row.invoiceUrl}
												target="_blank"
												rel="noreferrer"
												className="mt-1 flex w-fit items-center gap-1 text-xs text-primary"
											>
												Rēķins {row.invoiceNumber}
												<ExternalLink className="size-3" />
											</a>
										) : null}
									</td>
									<td className="max-w-[320px] px-4 py-3 text-xs text-muted-foreground">
										{row.position}
									</td>
									<td className="whitespace-nowrap px-6 py-3 text-right font-medium tabular-nums">
										{row.cents == null
											? "Summa nav zināma"
											: currency(row.cents / 100)}
									</td>
								</tr>
							))}
							{!selectedEntries.length ? (
								<tr>
									<td
										colSpan={4}
										className="px-6 py-10 text-center text-muted-foreground"
									>
										Šajā periodā nav izmaksu avotu.
									</td>
								</tr>
							) : null}
						</tbody>
					</table>
				</div>
			</section>

			<details className="rounded-xl border bg-card px-6 py-4">
				<summary className="cursor-pointer text-sm font-medium">
					PA1.6 materiālu pārdale{" "}
					<span className="ml-2 text-muted-foreground">
						{currency(reassignments.reduce((sum, row) => sum + row.amount, 0))}
					</span>
				</summary>
				<div className="pt-4">
					<label className="mb-4 flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={includeChanges}
							onChange={(event) => {
								setIncludeChanges(event.target.checked);
								setWork("");
								filters();
							}}
						/>
						Iekļaut ierosināto pārdali grafikā
					</label>
					<table className="w-full text-left text-xs">
						<thead>
							<tr className="text-muted-foreground">
								<th className="py-2 font-normal">No papildu darbiem</th>
								<th className="py-2 font-normal">Uz PA1.6 pamatdarbu</th>
								<th className="py-2 text-right font-normal">
									Materiālu izmaksas
								</th>
							</tr>
						</thead>
						<tbody>
							{reassignments.map((row) => (
								<tr key={row.from} className="border-t">
									<td className="py-3 pr-4">{row.from}</td>
									<td className="py-3 pr-4">{row.to}</td>
									<td className="py-3 text-right tabular-nums">
										{currency(row.amount)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
					<p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
						{includeChanges ? (
							<ArrowUpRight className="size-3" />
						) : (
							<ArrowDownRight className="size-3" />
						)}
						Kopējās projekta izmaksas nemainās. Darbu daudzumi un Begin darba
						izmaksas netiek pārdalītas.
					</p>
				</div>
			</details>
			<p className="text-xs text-muted-foreground">
				Izmaksas attēlotas pēc darba un materiāla/rēķina datuma; tas nav
				maksājumu plūsmas grafiks.
				{timeline.missingCostRecords
					? ` ${timeline.missingCostRecords} avotiem izmaksu summa nav zināma.`
					: ""}
				{timeline.undatedCost
					? ` Grafikā nav ietvertas izmaksas bez datuma: ${currency(timeline.undatedCost)}.`
					: ""}
			</p>
		</main>
	);
}
